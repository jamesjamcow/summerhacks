import { auth } from "@clerk/nextjs/server";
import { and, eq } from "drizzle-orm";
import { UTApi, UTFile } from "uploadthing/server";

import { getDb } from "@/db";
import { scrapbookMatchPages } from "@/db/schema";
import { verifyArenaResultReceipt } from "@/lib/arena-result-receipt";
import { createTripGroupPortrait, type TripPortraitPhoto } from "@/lib/gemini";
import { getRoomMembership, normalizeRoomCode } from "@/lib/scrapbook-rooms";
import type { TripPortrait } from "@/lib/trip-portrait";

export const maxDuration = 180;

const MAX_PHOTOS = 14;
const MAX_PHOTO_BYTES = 9 * 1024 * 1024;
const uploadThing = new UTApi();

function imageExtension(mimeType: string) {
  if (mimeType === "image/jpeg") return "jpg";
  if (mimeType === "image/webp") return "webp";
  return "png";
}

function publicError() {
  return "Gemini could not assemble the trip portrait right now. Please try again.";
}

async function downloadPhoto(input: {
  label: string;
  url: string;
}): Promise<TripPortraitPhoto> {
  const url = new URL(input.url);
  if (url.protocol !== "https:") throw new Error("Trip photos must use HTTPS URLs.");

  const response = await fetch(url, {
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(25_000),
  });
  if (!response.ok) throw new Error(`Could not read trip photo (${response.status}).`);
  if (new URL(response.url).protocol !== "https:") {
    throw new Error("Trip photo redirected to an unsupported URL.");
  }

  const declaredSize = Number(response.headers.get("content-length") || 0);
  if (declaredSize > MAX_PHOTO_BYTES) throw new Error("A trip photo exceeds the portrait limit.");
  const mimeType = response.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase() || "";
  if (!mimeType.startsWith("image/")) throw new Error("A trip photo URL did not return an image.");

  const bytes = new Uint8Array(await response.arrayBuffer());
  if (!bytes.length || bytes.byteLength > MAX_PHOTO_BYTES) {
    throw new Error("A trip photo is empty or exceeds the portrait limit.");
  }
  return { bytes, label: input.label, mimeType };
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Sign in required" }, { status: 401 });

  let body: { receipt?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }
  if (typeof body.receipt !== "string" || body.receipt.length > 8_000) {
    return Response.json({ error: "Arena result receipt required" }, { status: 400 });
  }

  let result;
  try {
    result = verifyArenaResultReceipt(body.receipt);
  } catch {
    return Response.json({ error: "The arena result could not be verified" }, { status: 400 });
  }

  const loser = result.players.find((player) => player.userId !== result.winnerId);
  const winner = result.players.find((player) => player.userId === result.winnerId);
  if (!loser || !winner) {
    return Response.json({ error: "Arena players missing" }, { status: 400 });
  }
  if (userId !== loser.userId) {
    return Response.json({ error: "Only the losing player receives this portrait" }, { status: 403 });
  }

  const roomCode = normalizeRoomCode(result.roomCode);
  const membership = await getRoomMembership(roomCode, userId);
  if (!membership || membership.roomId !== result.roomId) {
    return Response.json({ error: "Room membership required" }, { status: 403 });
  }

  const [page] = await getDb()
    .select({
      matchId: scrapbookMatchPages.matchId,
      memories: scrapbookMatchPages.memories,
      players: scrapbookMatchPages.players,
      winnerId: scrapbookMatchPages.winnerClerkUserId,
    })
    .from(scrapbookMatchPages)
    .where(and(
      eq(scrapbookMatchPages.matchId, result.matchId),
      eq(scrapbookMatchPages.roomId, membership.roomId),
    ))
    .limit(1);
  if (!page || page.winnerId !== result.winnerId || !page.players.some((player) => player.userId === userId)) {
    return Response.json({ error: "Save the match page before creating its portrait" }, { status: 409 });
  }

  const seen = new Set<string>();
  const photoSources = page.memories.flatMap((memory) => {
    if (!memory.fileType.startsWith("image/") || seen.has(memory.id)) return [];
    seen.add(memory.id);
    return [{
      label: memory.originalMemory || memory.name,
      url: memory.sourceUrl,
    }];
  }).slice(0, MAX_PHOTOS);
  if (!photoSources.length) {
    return Response.json({ error: "Add at least one photo before creating a trip portrait" }, { status: 422 });
  }

  try {
    const photos = await Promise.all(photoSources.map(downloadPhoto));
    const generated = await createTripGroupPortrait({
      loserName: loser.name,
      photos,
      winnerName: winner.name,
    });
    const generatedFile = new UTFile(
      [Buffer.from(generated.bytes)],
      `trip-portrait-${result.matchId}.${imageExtension(generated.mimeType)}`,
      { type: generated.mimeType },
    );
    const stored = await uploadThing.uploadFiles(generatedFile);
    if (stored.error || !stored.data) {
      throw new Error(stored.error?.message || "UploadThing rejected the generated portrait.");
    }

    const portrait: TripPortrait = {
      createdAt: new Date().toISOString(),
      imageUrl: stored.data.ufsUrl,
      loserName: loser.name,
      matchId: result.matchId,
      photoCount: photos.length,
      photoLabels: photos.map((photo) => photo.label.slice(0, 160)),
      roomCode,
      version: 1,
      winnerName: winner.name,
    };
    return Response.json({ portrait }, { status: 201 });
  } catch (error) {
    console.error("Trip portrait generation failed", {
      error: error instanceof Error ? error.message.slice(0, 500) : "Unknown portrait error",
      matchId: result.matchId,
      roomId: membership.roomId,
      userId,
    });
    return Response.json({ error: publicError() }, { status: 502 });
  }
}
