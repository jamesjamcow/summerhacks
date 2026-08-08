import { auth } from "@clerk/nextjs/server";

import {
  getArenaMatch,
  joinArenaQueue,
  leaveArenaMatch,
  publicMatch,
  recordArenaHit,
} from "@/lib/arena-server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function arenaError(error: unknown) {
  const code = error instanceof Error ? error.message : "UNKNOWN";
  if (code === "ROOM_MEMBERSHIP_REQUIRED") {
    return Response.json({ error: "Join this scrapbook room before entering its arena." }, { status: 403 });
  }
  if (code === "INVENTORY_REQUIRED") {
    return Response.json({ error: "Add at least one completed memory before entering the arena." }, { status: 400 });
  }
  if (code === "MATCH_NOT_FOUND") {
    return Response.json({ error: "Match not found." }, { status: 404 });
  }
  console.error("Arena request failed", error);
  return Response.json({ error: "The arena could not complete that request." }, { status: 500 });
}

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });
  const matchId = new URL(request.url).searchParams.get("matchId") ?? "";
  if (!uuidPattern.test(matchId)) return Response.json({ error: "Invalid match ID" }, { status: 400 });

  try {
    return Response.json(publicMatch(await getArenaMatch(matchId, userId)));
  } catch (error) {
    return arenaError(error);
  }
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });

  let body: { action?: unknown; matchId?: unknown; roomCode?: unknown; round?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  try {
    if (body.action === "queue") {
      const roomCode = typeof body.roomCode === "string" ? body.roomCode : "";
      return Response.json(publicMatch(await joinArenaQueue(roomCode, userId)));
    }

    const matchId = typeof body.matchId === "string" ? body.matchId : "";
    if (!uuidPattern.test(matchId)) return Response.json({ error: "Invalid match ID" }, { status: 400 });

    if (body.action === "hit") {
      const round = typeof body.round === "number" ? Math.floor(body.round) : 0;
      return Response.json(publicMatch(await recordArenaHit(matchId, userId, round)));
    }
    if (body.action === "leave") {
      return Response.json(publicMatch(await leaveArenaMatch(matchId, userId)));
    }
    return Response.json({ error: "Unknown arena action" }, { status: 400 });
  } catch (error) {
    return arenaError(error);
  }
}
