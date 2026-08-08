import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";

import { getDb } from "@/db";
import { scrapbookMembers, scrapbookRooms } from "@/db/schema";
import { getRoomMembership, normalizeRoomCode } from "@/lib/scrapbook-rooms";

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

  const members = await db
    .select({
      id: scrapbookMembers.clerkUserId,
      initials: scrapbookMembers.initials,
      name: scrapbookMembers.displayName,
    })
    .from(scrapbookMembers)
    .innerJoin(scrapbookRooms, eq(scrapbookMembers.roomId, scrapbookRooms.id))
    .where(eq(scrapbookRooms.code, code))
    .orderBy(asc(scrapbookMembers.joinedAt));

  return Response.json({ code, members, name: membership.roomName });
}
