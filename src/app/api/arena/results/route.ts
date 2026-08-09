import { auth } from "@clerk/nextjs/server";
import { and, asc, eq, isNotNull, max } from "drizzle-orm";

import { getDb } from "@/db";
import {
  scrapbookMatchPages,
  scrapbookMembers,
  uploads,
} from "@/db/schema";
import { verifyArenaResultReceipt } from "@/lib/arena-result-receipt";
import { isMemoryModelFileType } from "@/lib/memory-model";
import type { ScrapbookMatchPage, ScrapbookPageMemory } from "@/lib/scrapbook-pages";
import { getRoomMembership, normalizeRoomCode } from "@/lib/scrapbook-rooms";

type StoredPage = typeof scrapbookMatchPages.$inferSelect;

function pageResponse(page: StoredPage): ScrapbookMatchPage {
  return {
    completedAt: page.completedAt.toISOString(),
    id: page.id,
    matchId: page.matchId,
    memories: page.memories,
    pageNumber: page.pageNumber,
    players: page.players,
    resultReason: page.resultReason === "forfeit" ? "forfeit" : "score",
    winnerId: page.winnerClerkUserId,
    winnerName: page.winnerName,
  };
}

async function findPage(matchId: string) {
  const [page] = await getDb()
    .select()
    .from(scrapbookMatchPages)
    .where(eq(scrapbookMatchPages.matchId, matchId))
    .limit(1);
  return page;
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

  if (!result.players.some((player) => player.userId === userId)) {
    return Response.json({ error: "Only match participants can save this page" }, { status: 403 });
  }

  const roomCode = normalizeRoomCode(result.roomCode);
  const membership = await getRoomMembership(roomCode, userId);
  if (!membership || membership.roomId !== result.roomId) {
    return Response.json({ error: "Room membership required" }, { status: 403 });
  }

  const alreadySaved = await findPage(result.matchId);
  if (alreadySaved) return Response.json({ page: pageResponse(alreadySaved) });

  const db = getDb();
  const [members, completedUploads] = await Promise.all([
    db
      .select({ id: scrapbookMembers.clerkUserId, name: scrapbookMembers.displayName })
      .from(scrapbookMembers)
      .where(eq(scrapbookMembers.roomId, membership.roomId))
      .orderBy(asc(scrapbookMembers.joinedAt)),
    db
      .select({
        artifactType: uploads.generatedFileType,
        artifactUrl: uploads.generatedFileUrl,
        fileName: uploads.fileName,
        fileType: uploads.fileType,
        fileUrl: uploads.fileUrl,
        id: uploads.id,
        keyObject: uploads.keyObject,
        recipientId: uploads.recipientClerkUserId,
        uploaderId: uploads.clerkUserId,
      })
      .from(uploads)
      .where(and(
        eq(uploads.roomId, membership.roomId),
        eq(uploads.processingStatus, "complete"),
        isNotNull(uploads.generatedFileUrl),
        isNotNull(uploads.keyObject),
        isNotNull(uploads.recipientClerkUserId),
      ))
      .orderBy(asc(uploads.createdAt))
      .limit(200),
  ]);
  const memberNames = new Map(members.map((member) => [member.id, member.name]));
  const memories = completedUploads.flatMap<ScrapbookPageMemory>((upload) => {
    if (!upload.artifactUrl || !upload.keyObject || !upload.recipientId) return [];
    return [{
      addedBy: memberNames.get(upload.uploaderId) ?? "A scrapbook member",
      ...(isMemoryModelFileType(upload.artifactType)
        ? { artifactModelUrl: upload.artifactUrl }
        : { artifactImageUrl: upload.artifactUrl }),
      fileType: upload.fileType,
      id: upload.id,
      name: upload.keyObject,
      originalMemory: upload.fileName,
      recipientId: upload.recipientId,
      recipientName: memberNames.get(upload.recipientId) ?? "A scrapbook member",
      sourceUrl: upload.fileUrl,
    }];
  });
  const winner = result.players.find((player) => player.userId === result.winnerId);
  if (!winner) return Response.json({ error: "Arena winner missing" }, { status: 400 });

  for (let attempt = 0; attempt < 3; attempt += 1) {
    const [latest] = await db
      .select({ pageNumber: max(scrapbookMatchPages.pageNumber) })
      .from(scrapbookMatchPages)
      .where(eq(scrapbookMatchPages.roomId, membership.roomId));
    const pageNumber = (latest?.pageNumber ?? 0) + 1;
    const [created] = await db
      .insert(scrapbookMatchPages)
      .values({
        completedAt: new Date(result.completedAt),
        matchId: result.matchId,
        memories,
        pageNumber,
        players: result.players,
        resultReason: result.resultReason,
        roomId: membership.roomId,
        winnerClerkUserId: result.winnerId,
        winnerName: winner.name,
      })
      .onConflictDoNothing()
      .returning();
    if (created) return Response.json({ page: pageResponse(created) }, { status: 201 });

    const concurrentPage = await findPage(result.matchId);
    if (concurrentPage) return Response.json({ page: pageResponse(concurrentPage) });
  }

  return Response.json({ error: "Could not number the scrapbook page" }, { status: 409 });
}
