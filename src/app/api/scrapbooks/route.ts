import { auth } from "@clerk/nextjs/server";
import { eq } from "drizzle-orm";

import { getDb } from "@/db";
import { scrapbookMembers, scrapbookRooms } from "@/db/schema";
import { getAuthenticatedProfile, normalizeRoomCode } from "@/lib/scrapbook-rooms";

const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function generateRoomCode() {
  const values = new Uint32Array(6);
  crypto.getRandomValues(values);
  return Array.from(values, (value) => alphabet[value % alphabet.length]).join("");
}

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return errorResponse("Sign in required", 401);

  let body: { action?: unknown; code?: unknown; name?: unknown };
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid request body", 400);
  }

  const profile = await getAuthenticatedProfile(userId);
  const db = getDb();

  if (body.action === "create") {
    const roomName = typeof body.name === "string" ? body.name.trim().slice(0, 48) : "";
    if (!roomName) return errorResponse("A scrapbook name is required", 400);

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const code = generateRoomCode();
      const [room] = await db
        .insert(scrapbookRooms)
        .values({ code, name: roomName, ownerClerkUserId: userId })
        .onConflictDoNothing({ target: scrapbookRooms.code })
        .returning({ code: scrapbookRooms.code, id: scrapbookRooms.id, name: scrapbookRooms.name });
      if (!room) continue;

      await db.insert(scrapbookMembers).values({
        clerkUserId: userId,
        displayName: profile.name,
        initials: profile.initials,
        roomId: room.id,
      });
      return Response.json({ code: room.code, name: room.name });
    }

    return errorResponse("Could not allocate a room code. Try again.", 503);
  }

  if (body.action === "join") {
    const code = normalizeRoomCode(typeof body.code === "string" ? body.code : "");
    if (code.length < 4) return errorResponse("Enter a valid room code", 400);

    const [room] = await db
      .select({ code: scrapbookRooms.code, id: scrapbookRooms.id, name: scrapbookRooms.name })
      .from(scrapbookRooms)
      .where(eq(scrapbookRooms.code, code))
      .limit(1);
    if (!room) return errorResponse("That scrapbook room does not exist", 404);

    await db
      .insert(scrapbookMembers)
      .values({
        clerkUserId: userId,
        displayName: profile.name,
        initials: profile.initials,
        roomId: room.id,
      })
      .onConflictDoUpdate({
        target: [scrapbookMembers.roomId, scrapbookMembers.clerkUserId],
        set: {
          displayName: profile.name,
          initials: profile.initials,
          lastSeenAt: new Date(),
        },
      });

    return Response.json({ code: room.code, name: room.name });
  }

  return errorResponse("Unknown scrapbook action", 400);
}
