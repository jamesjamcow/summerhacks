import "server-only";

import { and, desc, eq, isNotNull } from "drizzle-orm";

import { getDb } from "@/db";
import { scrapbookMembers, uploads, userAvatars } from "@/db/schema";
import type { ArenaTicketItem } from "@/lib/arena-ticket";
import { isMemoryModelFileType } from "@/lib/memory-model";
import { getRoomMembership } from "@/lib/scrapbook-rooms";

export async function loadArenaSession(roomCode: string, userId: string) {
  const membership = await getRoomMembership(roomCode, userId);
  if (!membership) throw new Error("ROOM_MEMBERSHIP_REQUIRED");

  const db = getDb();
  const [[member], [avatar], inventory] = await Promise.all([
    db
      .select({ name: scrapbookMembers.displayName })
      .from(scrapbookMembers)
      .where(and(
        eq(scrapbookMembers.roomId, membership.roomId),
        eq(scrapbookMembers.clerkUserId, userId),
      ))
      .limit(1),
    db
      .select({ url: userAvatars.generatedFileUrl })
      .from(userAvatars)
      .where(and(
        eq(userAvatars.clerkUserId, userId),
        eq(userAvatars.processingStatus, "complete"),
        isNotNull(userAvatars.generatedFileUrl),
      ))
      .limit(1),
    db
      .select({
        artifactType: uploads.generatedFileType,
        artifactUrl: uploads.generatedFileUrl,
        id: uploads.id,
        memoryLabel: uploads.fileName,
        name: uploads.keyObject,
        sourceType: uploads.fileType,
        sourceUrl: uploads.fileUrl,
      })
      .from(uploads)
      .where(and(
        eq(uploads.roomId, membership.roomId),
        eq(uploads.recipientClerkUserId, userId),
        eq(uploads.processingStatus, "complete"),
        isNotNull(uploads.generatedFileUrl),
        isNotNull(uploads.keyObject),
      ))
      .orderBy(desc(uploads.createdAt))
      .limit(6),
  ]);

  if (!member) throw new Error("ROOM_MEMBERSHIP_REQUIRED");

  const items = inventory.flatMap<ArenaTicketItem>((item) => {
    if (!item.artifactUrl || !item.name) return [];
    return [{
      id: item.id,
      name: item.name,
      memoryLabel: item.memoryLabel,
      ...(item.sourceType.startsWith("image/")
        ? { originalImageUrl: item.sourceUrl }
        : {}),
      ...(isMemoryModelFileType(item.artifactType)
        ? { modelUrl: item.artifactUrl }
        : { imageUrl: item.artifactUrl }),
    }];
  });
  if (!items.length) throw new Error("INVENTORY_REQUIRED");

  return {
    avatarUrl: avatar?.url ?? undefined,
    inventory: items,
    name: member.name,
    roomCode: roomCode.trim().toUpperCase(),
    roomId: membership.roomId,
    userId,
  };
}
