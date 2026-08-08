import "server-only";

import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UTFile, UploadThingError } from "uploadthing/server";

import { getDb } from "@/db";
import { uploads, userAvatars } from "@/db/schema";
import type { CharacterGenerationResult } from "@/lib/character-avatar";
import { createCharacterAvatar, createMemoryImage } from "@/lib/gemini";
import type { MemoryGenerationResult } from "@/lib/memory-artifacts";

const upload = createUploadthing();
const uploadThing = new UTApi();

function imageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function artifactFileName(keyObject: string, mimeType: string) {
  const slug = keyObject.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "memory-artifact"}-${crypto.randomUUID()}.${imageExtension(mimeType)}`;
}

function avatarFileName(mimeType: string) {
  return `character-avatar-${crypto.randomUUID()}.${imageExtension(mimeType)}`;
}

function publicGenerationError(error: unknown) {
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
    return "Gemini is not configured yet. Add GEMINI_API_KEY and try again.";
  }

  if (
    error instanceof Error &&
    /quota|billing|resource_exhausted/i.test(error.message)
  ) {
    return "Gemini image generation has no free-tier API quota. Enable billing for this Google AI project, then try again.";
  }

  return "The memory was uploaded, but its illustration could not be generated. Please try again.";
}

export const uploadRouter = {
  workspaceFile: upload({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    audio: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    text: { maxFileSize: "1MB", maxFileCount: 5 },
  }, { awaitServerData: true })
    .middleware(async ({ files }) => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("You must be signed in to upload files.");
      }

      if (files.length > 5) {
        throw new UploadThingError("Upload no more than five memories at a time.");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [sourceUpload] = await getDb()
        .insert(uploads)
        .values({
          clerkUserId: metadata.userId,
          fileKey: file.key,
          fileName: file.name,
          fileUrl: file.ufsUrl,
          fileType: file.type,
          fileSize: file.size,
          processingStatus: "processing",
        })
        .returning({ id: uploads.id });

      if (!sourceUpload) {
        throw new UploadThingError("The uploaded memory could not be recorded.");
      }

      try {
        const sourceResponse = await fetch(file.ufsUrl, { cache: "no-store" });
        if (!sourceResponse.ok) {
          throw new Error(`Could not read uploaded memory (${sourceResponse.status}).`);
        }

        const generated = await createMemoryImage({
          bytes: new Uint8Array(await sourceResponse.arrayBuffer()),
          fileName: file.name,
          mimeType: file.type,
        });
        const generatedFile = new UTFile(
          [Buffer.from(generated.bytes)],
          artifactFileName(generated.keyObject, generated.mimeType),
          { type: generated.mimeType },
        );
        const storedArtifact = await uploadThing.uploadFiles(generatedFile);

        if (storedArtifact.error || !storedArtifact.data) {
          throw new Error(
            storedArtifact.error?.message || "UploadThing rejected the generated image.",
          );
        }

        await getDb()
          .update(uploads)
          .set({
            processingStatus: "complete",
            keyObject: generated.keyObject,
            generatedFileKey: storedArtifact.data.key,
            generatedFileUrl: storedArtifact.data.ufsUrl,
            generatedFileType: storedArtifact.data.type,
            generatedFileSize: storedArtifact.data.size,
            generationError: null,
            processedAt: new Date(),
          })
          .where(eq(uploads.id, sourceUpload.id));

        return {
          status: "complete",
          artifact: {
            id: sourceUpload.id,
            name: generated.keyObject,
            artifactImageUrl: storedArtifact.data.ufsUrl,
            originalMemory: file.name,
            addedBy: "You",
          },
        } satisfies MemoryGenerationResult;
      } catch (error) {
        const internalMessage =
          error instanceof Error ? error.message.slice(0, 500) : "Unknown generation error";

        console.error("Memory artifact generation failed", {
          error: internalMessage,
          sourceFileKey: file.key,
          uploadId: sourceUpload.id,
        });

        await getDb()
          .update(uploads)
          .set({
            processingStatus: "failed",
            generationError: internalMessage,
            processedAt: new Date(),
          })
          .where(eq(uploads.id, sourceUpload.id));

        return {
          status: "failed",
          sourceName: file.name,
          error: publicGenerationError(error),
        } satisfies MemoryGenerationResult;
      }
    }),
  characterPhoto: upload({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
  }, { awaitServerData: true })
    .middleware(async () => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("You must be signed in to upload a photo.");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [existing] = await getDb()
        .select({
          id: userAvatars.id,
          sourceFileKey: userAvatars.sourceFileKey,
          generatedFileKey: userAvatars.generatedFileKey,
        })
        .from(userAvatars)
        .where(eq(userAvatars.clerkUserId, metadata.userId));

      try {
        const sourceResponse = await fetch(file.ufsUrl, { cache: "no-store" });
        if (!sourceResponse.ok) {
          throw new Error(`Could not read uploaded photo (${sourceResponse.status}).`);
        }

        const generated = await createCharacterAvatar({
          bytes: new Uint8Array(await sourceResponse.arrayBuffer()),
          mimeType: file.type,
        });
        const generatedFile = new UTFile(
          [Buffer.from(generated.bytes)],
          avatarFileName(generated.mimeType),
          { type: generated.mimeType },
        );
        const storedAvatar = await uploadThing.uploadFiles(generatedFile);

        if (storedAvatar.error || !storedAvatar.data) {
          throw new Error(
            storedAvatar.error?.message || "UploadThing rejected the generated avatar.",
          );
        }

        const staleKeys = existing
          ? [existing.sourceFileKey, existing.generatedFileKey].filter(
              (key): key is string => Boolean(key) && key !== file.key,
            )
          : [];
        if (staleKeys.length) {
          await uploadThing.deleteFiles(staleKeys).catch((error) => {
            console.error("Failed to delete stale character avatar files", { error, staleKeys });
          });
        }

        const values = {
          clerkUserId: metadata.userId,
          sourceFileKey: file.key,
          sourceFileUrl: file.ufsUrl,
          sourceFileType: file.type,
          sourceFileSize: file.size,
          processingStatus: "complete",
          generatedFileKey: storedAvatar.data.key,
          generatedFileUrl: storedAvatar.data.ufsUrl,
          generatedFileType: storedAvatar.data.type,
          generatedFileSize: storedAvatar.data.size,
          generationError: null,
          processedAt: new Date(),
          updatedAt: new Date(),
        };

        if (existing) {
          await getDb()
            .update(userAvatars)
            .set(values)
            .where(eq(userAvatars.id, existing.id));
        } else {
          await getDb().insert(userAvatars).values(values);
        }

        return {
          status: "complete",
          avatarImageUrl: storedAvatar.data.ufsUrl,
        } satisfies CharacterGenerationResult;
      } catch (error) {
        const internalMessage =
          error instanceof Error ? error.message.slice(0, 500) : "Unknown generation error";

        console.error("Character avatar generation failed", {
          error: internalMessage,
          sourceFileKey: file.key,
          clerkUserId: metadata.userId,
        });

        if (existing) {
          // The newly uploaded photo didn't produce a usable avatar. Discard
          // it rather than leaving an orphaned blob or overwriting the prior
          // successful avatar's source metadata.
          await uploadThing.deleteFiles([file.key]).catch((error) => {
            console.error("Failed to delete failed character photo upload", { error, key: file.key });
          });

          await getDb()
            .update(userAvatars)
            .set({
              processingStatus: "failed",
              generationError: internalMessage,
              processedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(userAvatars.id, existing.id));
        } else {
          await getDb().insert(userAvatars).values({
            clerkUserId: metadata.userId,
            sourceFileKey: file.key,
            sourceFileUrl: file.ufsUrl,
            sourceFileType: file.type,
            sourceFileSize: file.size,
            processingStatus: "failed",
            generationError: internalMessage,
            processedAt: new Date(),
            updatedAt: new Date(),
          });
        }

        return {
          status: "failed",
          error: publicGenerationError(error),
        } satisfies CharacterGenerationResult;
      }
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
