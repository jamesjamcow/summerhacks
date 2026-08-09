import { auth, currentUser } from "@clerk/nextjs/server";
import { and, eq, isNotNull } from "drizzle-orm";

import { BookExperience } from "@/components/book/book-experience";
import { getDb } from "@/db";
import { userAvatars } from "@/db/schema";
import { isCharacterAvatarFileType } from "@/lib/character-avatar";

export default async function HomePage() {
  await auth.protect();
  const user = await currentUser();

  if (!user) return null;

  const name =
    user.fullName ||
    user.username ||
    user.primaryEmailAddress?.emailAddress.split("@")[0] ||
    "Memory keeper";
  const greetingName =
    user.username ||
    user.firstName ||
    name.split(/\s+/)[0] ||
    "there";
  const initials = name
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const [avatar] = await getDb()
    .select({
      generatedFileType: userAvatars.generatedFileType,
      generatedFileUrl: userAvatars.generatedFileUrl,
    })
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
      greetingName={greetingName}
      viewer={{
        id: user.id,
        initials,
        name,
        ...(isCharacterAvatarFileType(avatar?.generatedFileType)
          ? { avatarModelUrl: avatar?.generatedFileUrl ?? undefined }
          : { avatarImageUrl: avatar?.generatedFileUrl ?? undefined }),
      }}
    />
  );
}
