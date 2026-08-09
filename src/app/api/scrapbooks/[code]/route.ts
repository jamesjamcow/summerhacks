import { auth } from "@clerk/nextjs/server";
import { and, asc, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/db";
import { scrapbookMatchPages, scrapbookMembers, uploads, userAvatars } from "@/db/schema";
import { isCharacterAvatarFileType } from "@/lib/character-avatar";
import { isMemoryModelFileType } from "@/lib/memory-model";
import { getRoomMembership, normalizeRoomCode } from "@/lib/scrapbook-rooms";
import type { ScrapbookMatchPage } from "@/lib/scrapbook-pages";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ code: string }> },
) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });

  const code = normalizeRoomCode((await params).code);
  const membership = await getRoomMembership(code, userId);
  if (!membership) return Response.json({ error: "Room membership required" }, { status: 403 });

  const db = getDb();
  await db
    .update(scrapbookMembers)
    .set({ lastSeenAt: new Date() })
    .where(
      and(
        eq(scrapbookMembers.roomId, membership.roomId),
        eq(scrapbookMembers.clerkUserId, userId),
      ),
    );

  const storedMembers = await db
    .select({
      id: scrapbookMembers.clerkUserId,
      initials: scrapbookMembers.initials,
      name: scrapbookMembers.displayName,
      avatarFileType: userAvatars.generatedFileType,
      avatarFileUrl: userAvatars.generatedFileUrl,
    })
    .from(scrapbookMembers)
    .leftJoin(
      userAvatars,
      and(
        eq(userAvatars.clerkUserId, scrapbookMembers.clerkUserId),
        eq(userAvatars.processingStatus, "complete"),
        isNotNull(userAvatars.generatedFileUrl),
      ),
    )
    .where(eq(scrapbookMembers.roomId, membership.roomId))
    .orderBy(asc(scrapbookMembers.joinedAt));

  const members = storedMembers.map(({ avatarFileType, avatarFileUrl, ...member }) => ({
    ...member,
    ...(isCharacterAvatarFileType(avatarFileType)
      ? { avatarModelUrl: avatarFileUrl }
      : { avatarImageUrl: avatarFileUrl }),
  }));

  const memberIds = members.map((member) => member.id);
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const completedUploads = await db
    .select({
      clerkUserId: uploads.clerkUserId,
      fileName: uploads.fileName,
      fileType: uploads.fileType,
      fileUrl: uploads.fileUrl,
      generatedFileUrl: uploads.generatedFileUrl,
      generatedFileType: uploads.generatedFileType,
      id: uploads.id,
      keyObject: uploads.keyObject,
      recipientClerkUserId: uploads.recipientClerkUserId,
      roomId: uploads.roomId,
    })
    .from(uploads)
    .where(
      and(
        eq(uploads.processingStatus, "complete"),
        isNotNull(uploads.generatedFileUrl),
        eq(uploads.roomId, membership.roomId),
      ),
    )
    .orderBy(desc(uploads.createdAt))
    .limit(200);

  const memberIdSet = new Set(memberIds);
  const artifacts = completedUploads.flatMap((upload) => {
    const recipientId = upload.recipientClerkUserId;

    if (
      !recipientId ||
      !memberIdSet.has(recipientId) ||
      !upload.generatedFileUrl ||
      !upload.keyObject
    ) {
      return [];
    }

    return [{
      addedBy:
        upload.clerkUserId === userId
          ? "You"
          : memberNames.get(upload.clerkUserId) ?? "A scrapbook member",
      ...(isMemoryModelFileType(upload.generatedFileType)
        ? { artifactModelUrl: upload.generatedFileUrl }
        : { artifactImageUrl: upload.generatedFileUrl }),
      ...(upload.fileType.startsWith("image/")
        ? { originalImageUrl: upload.fileUrl }
        : {}),
      id: upload.id,
      name: upload.keyObject,
      originalMemory: upload.fileName,
      recipientId,
    }];
  });

  const storedPages = await db
    .select()
    .from(scrapbookMatchPages)
    .where(eq(scrapbookMatchPages.roomId, membership.roomId))
    .orderBy(asc(scrapbookMatchPages.pageNumber))
    .limit(50);
  const pages: ScrapbookMatchPage[] = storedPages.map((page) => ({
    completedAt: page.completedAt.toISOString(),
    id: page.id,
    matchId: page.matchId,
    memories: page.memories,
    pageNumber: page.pageNumber,
    players: page.players,
    resultReason: page.resultReason === "forfeit" ? "forfeit" : "score",
    winnerId: page.winnerClerkUserId,
    winnerName: page.winnerName,
  }));

  return Response.json({ artifacts, code, members, name: membership.roomName, pages });
}
