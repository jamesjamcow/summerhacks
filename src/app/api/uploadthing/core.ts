import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { UploadThingError } from "uploadthing/server";

import { getDb } from "@/db";
import { uploads } from "@/db/schema";

const upload = createUploadthing();

export const uploadRouter = {
  workspaceFile: upload({
    image: { maxFileSize: "4MB", maxFileCount: 1 },
    pdf: { maxFileSize: "8MB", maxFileCount: 1 },
    text: { maxFileSize: "1MB", maxFileCount: 1 },
  })
    .middleware(async () => {
      const { userId } = await auth();

      if (!userId) {
        throw new UploadThingError("You must be signed in to upload files.");
      }

      return { userId };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      await getDb().insert(uploads).values({
        clerkUserId: metadata.userId,
        fileKey: file.key,
        fileName: file.name,
        fileUrl: file.ufsUrl,
        fileType: file.type,
        fileSize: file.size,
      });

      return { uploadedBy: metadata.userId, url: file.ufsUrl };
    }),
} satisfies FileRouter;

export type UploadRouter = typeof uploadRouter;
