import { auth } from "@clerk/nextjs/server";

import { loadArenaSession } from "@/lib/arena-session";
import { createArenaTicket } from "@/lib/arena-ticket";
import { normalizeRoomCode } from "@/lib/scrapbook-rooms";

function arenaError(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "ROOM_MEMBERSHIP_REQUIRED") {
    return Response.json(
      { error: "Join this scrapbook room before entering its arena." },
      { status: 403 },
    );
  }
  if (code === "INVENTORY_REQUIRED") {
    return Response.json(
      { error: "Add at least one completed memory before entering the arena." },
      { status: 400 },
    );
  }
  console.error("Could not create an arena session", error);
  return Response.json(
    { error: "The arena could not create a secure realtime session." },
    { status: 500 },
  );
}

function publicColyseusEndpoint(request: Request) {
  if (process.env.COLYSEUS_PUBLIC_URL) return process.env.COLYSEUS_PUBLIC_URL;
  const requestUrl = new URL(request.url);
  const protocol = requestUrl.protocol === "https:" ? "https:" : "http:";
  return `${protocol}//${requestUrl.hostname}:${process.env.COLYSEUS_PORT || "2567"}`;
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });

  let body: { roomCode?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const roomCode = normalizeRoomCode(typeof body.roomCode === "string" ? body.roomCode : "");
  if (!roomCode) return Response.json({ error: "Room code required" }, { status: 400 });

  try {
    const session = await loadArenaSession(roomCode, userId);
    const token = createArenaTicket({
      ...session,
      expiresAt: Date.now() + 60_000,
      nonce: crypto.randomUUID(),
      version: 1,
    });
    return Response.json({ endpoint: publicColyseusEndpoint(request), token });
  } catch (error) {
    return arenaError(error);
  }
}
