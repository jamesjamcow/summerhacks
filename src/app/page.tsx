import { auth, currentUser } from "@clerk/nextjs/server";
import { and, desc, eq, isNotNull } from "drizzle-orm";

import { BookExperience } from "@/components/book/book-experience";
import { getDb } from "@/db";
import { uploads, userAvatars } from "@/db/schema";

export default async function HomePage() {
  await auth.protect();
  const user = await currentUser();

  if (!user) return null;

  const name =
    user.fullName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Memory keeper";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const completedUploads = await getDb()
    .select({
      id: uploads.id,
      keyObject: uploads.keyObject,
      generatedFileUrl: uploads.generatedFileUrl,
      fileName: uploads.fileName,
    })
    .from(uploads)
    .where(
      and(
        eq(uploads.clerkUserId, user.id),
        eq(uploads.processingStatus, "complete"),
        isNotNull(uploads.generatedFileUrl),
      ),
    )
    .orderBy(desc(uploads.createdAt))
    .limit(50);

  const initialArtifacts = completedUploads.flatMap((upload) =>
    upload.generatedFileUrl && upload.keyObject
      ? [
          {
            id: upload.id,
            name: upload.keyObject,
            artifactImageUrl: upload.generatedFileUrl,
            originalMemory: upload.fileName,
            addedBy: "You",
          },
        ]
      : [],
  );

  const [avatar] = await getDb()
    .select({ generatedFileUrl: userAvatars.generatedFileUrl })
    .from(userAvatars)
    .where(
      and(
        eq(userAvatars.clerkUserId, user.id),
        eq(userAvatars.processingStatus, "complete"),
        isNotNull(userAvatars.generatedFileUrl),
      ),
    );

  return (
    <BookExperience
      initialArtifacts={initialArtifacts}
      viewer={{
        id: user.id,
        initials,
        name,
        avatarUrl: avatar?.generatedFileUrl ?? undefined,
      }}
    />
  );
}
