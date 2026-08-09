import "server-only";

import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UTApi, UTFile, UploadThingError } from "uploadthing/server";
import { z } from "zod";

import { getDb } from "@/db";
import { scrapbookMembers, uploads, userAvatars } from "@/db/schema";
import type { CharacterGenerationResult } from "@/lib/character-avatar";
import { createCharacterAvatar, createMemoryModelArtifact } from "@/lib/gemini";
import type { MemoryGenerationResult } from "@/lib/memory-artifacts";
import { getRoomMembership } from "@/lib/scrapbook-rooms";

const upload = createUploadthing();
const uploadThing = new UTApi();

function artifactFileName(keyObject: string) {
  const slug = keyObject.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  return `${slug || "memory-artifact"}-${crypto.randomUUID()}.json`;
}

function avatarFileName() {
  return `character-avatar-${crypto.randomUUID()}.json`;
}

function publicGenerationError(error: unknown, kind: "avatar" | "memory") {
  if (error instanceof Error && error.message.includes("GEMINI_API_KEY")) {
    return "Gemini is not configured yet. Add GEMINI_API_KEY and try again.";
  }

  if (
    error instanceof Error &&
    /quota|billing|resource_exhausted/i.test(error.message)
  ) {
    return "Gemini generation is out of quota for this Google AI project. Check billing or quota, then try again.";
  }

  if (kind === "avatar" && error instanceof Error && /invalid argument/i.test(error.message)) {
    return "Gemini rejected the avatar model request before reading the photo. Please try again.";
  }

  return kind === "memory"
    ? "The memory was uploaded, but its 3D keepsake could not be generated. Please try again."
    : "The photo was uploaded, but its character could not be generated. Please try again.";
}

export const uploadRouter = {
  workspaceFile: upload({
    image: { maxFileSize: "8MB", maxFileCount: 5 },
    audio: { maxFileSize: "8MB", maxFileCount: 5 },
    pdf: { maxFileSize: "8MB", maxFileCount: 5 },
    text: { maxFileSize: "1MB", maxFileCount: 5 },
  }, { awaitServerData: true })
    .input(z.object({
      recipientUserId: z.string().min(1).max(255).nullable(),
      roomCode: z.string().trim().min(4).max(8).nullable(),
    }))
    .middleware(async ({ files, input }) => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("You must be signed in to upload files.");
      }

      if (files.length > 5) {
        throw new UploadThingError("Upload no more than five memories at a time.");
      }

      if (!input.roomCode && !input.recipientUserId) {
        return {
          recipientUserId: userId,
          roomId: null,
          userId,
        };
      }

      if (!input.roomCode || !input.recipientUserId) {
        throw new UploadThingError("Choose a scrapbook member before uploading.");
      }

      const membership = await getRoomMembership(input.roomCode, userId);
      if (!membership) {
        throw new UploadThingError("Join this scrapbook before uploading memories.");
      }

      const [recipient] = await getDb()
        .select({ userId: scrapbookMembers.clerkUserId })
        .from(scrapbookMembers)
        .where(
          and(
            eq(scrapbookMembers.roomId, membership.roomId),
            eq(scrapbookMembers.clerkUserId, input.recipientUserId),
          ),
        )
        .limit(1);

      if (!recipient) {
        throw new UploadThingError("That person is not a member of this scrapbook.");
      }

      return {
        recipientUserId: recipient.userId,
        roomId: membership.roomId,
        userId,
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      const [sourceUpload] = await getDb()
        .insert(uploads)
        .values({
          clerkUserId: metadata.userId,
          roomId: metadata.roomId,
          recipientClerkUserId: metadata.recipientUserId,
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

        const generated = await createMemoryModelArtifact({
          bytes: new Uint8Array(await sourceResponse.arrayBuffer()),
          fileName: file.name,
          mimeType: file.type,
        });
        const generatedFile = new UTFile(
          [Buffer.from(generated.bytes)],
          artifactFileName(generated.keyObject),
          { type: generated.mimeType },
        );
        const storedArtifact = await uploadThing.uploadFiles(generatedFile);

        if (storedArtifact.error || !storedArtifact.data) {
          throw new Error(
            storedArtifact.error?.message || "UploadThing rejected the generated 3D model.",
          );
        }

        await getDb()
          .update(uploads)
          .set({
            processingStatus: "complete",
            keyObject: generated.keyObject,
            itemType: generated.spec.itemType,
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
            itemType: generated.spec.itemType,
            artifactModelUrl: storedArtifact.data.ufsUrl,
            ...(file.type.startsWith("image/")
              ? { originalImageUrl: file.ufsUrl }
              : {}),
            originalMemory: file.name,
            addedBy: "You",
            recipientId: metadata.recipientUserId,
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
          error: publicGenerationError(error, "memory"),
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
          avatarFileName(),
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
          generatedFileType: generated.mimeType,
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
          avatarModelUrl: storedAvatar.data.ufsUrl,
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

          if (!existing.generatedFileKey) {
            await getDb()
              .update(userAvatars)
              .set({
                processingStatus: "failed",
                generationError: internalMessage,
                processedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(userAvatars.id, existing.id));
          }
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
          error: publicGenerationError(error, "avatar"),
        } satisfies CharacterGenerationResult;
      }
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
