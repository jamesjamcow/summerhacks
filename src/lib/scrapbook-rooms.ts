import "server-only";

import { currentUser } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { scrapbookMembers, scrapbookRooms } from "@/db/schema";

export function normalizeRoomCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8);
}

export async function getAuthenticatedProfile(userId: string) {
  const user = await currentUser();
  if (!user || user.id !== userId) throw new Error("Authenticated profile unavailable");
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
  return { initials, name };
}

export async function getRoomMembership(code: string, userId: string) {
  const [membership] = await getDb()
    .select({
      displayName: scrapbookMembers.displayName,
      initials: scrapbookMembers.initials,
      roomId: scrapbookRooms.id,
      roomName: scrapbookRooms.name,
    })
    .from(scrapbookMembers)
    .innerJoin(scrapbookRooms, eq(scrapbookMembers.roomId, scrapbookRooms.id))
    .where(
      and(
        eq(scrapbookRooms.code, normalizeRoomCode(code)),
        eq(scrapbookMembers.clerkUserId, userId),
      ),
    )
    .limit(1);
  return membership;
}
