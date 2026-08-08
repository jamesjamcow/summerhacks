import "server-only";

import { and, asc, desc, eq, inArray, isNull, isNotNull, lt, ne, or, sql } from "drizzle-orm";

import type { ArenaPlayer } from "@/components/arena/arena-types";
import {
  beginRound,
  createInitialArenaState,
  finishMemoryFlash,
  forfeitMatch,
  markPreloadComplete,
  pairPlayers,
  resolveRound,
} from "@/components/arena/match-machine";
import { getDb } from "@/db";
import { arenaMatches, scrapbookMembers, uploads } from "@/db/schema";
import { getRoomMembership } from "@/lib/scrapbook-rooms";

type MatchRow = typeof arenaMatches.$inferSelect;

async function loadArenaPlayer(roomId: string, userId: string): Promise<ArenaPlayer> {
  const db = getDb();
  const [member] = await db
    .select({ name: scrapbookMembers.displayName })
    .from(scrapbookMembers)
    .where(
      and(
        eq(scrapbookMembers.roomId, roomId),
        eq(scrapbookMembers.clerkUserId, userId),
      ),
    )
    .limit(1);
  if (!member) throw new Error("ROOM_MEMBERSHIP_REQUIRED");

  const inventory = await db
    .select({
      id: uploads.id,
      imageUrl: uploads.generatedFileUrl,
      memoryLabel: uploads.fileName,
      name: uploads.keyObject,
    })
    .from(uploads)
    .where(
      and(
        eq(uploads.clerkUserId, userId),
        eq(uploads.processingStatus, "complete"),
        isNotNull(uploads.generatedFileUrl),
        isNotNull(uploads.keyObject),
      ),
    )
    .orderBy(desc(uploads.createdAt))
    .limit(50);

  return {
    id: userId,
    inventory: inventory.flatMap((item) =>
      item.imageUrl && item.name
        ? [{ id: item.id, imageUrl: item.imageUrl, memoryLabel: item.memoryLabel, name: item.name }]
        : [],
    ),
    name: member.name,
    userId,
  };
}

function waitingState(matchId: string) {
  return { ...markPreloadComplete(createInitialArenaState()), matchId };
}

function isParticipant(match: MatchRow, userId: string) {
  return match.playerOneClerkUserId === userId || match.playerTwoClerkUserId === userId;
}

async function findUserMatch(roomId: string, userId: string) {
  const [match] = await getDb()
    .select()
    .from(arenaMatches)
    .where(
      and(
        eq(arenaMatches.roomId, roomId),
        inArray(arenaMatches.status, ["waiting", "active"]),
        or(
          eq(arenaMatches.playerOneClerkUserId, userId),
          eq(arenaMatches.playerTwoClerkUserId, userId),
        ),
      ),
    )
    .orderBy(desc(arenaMatches.updatedAt))
    .limit(1);
  return match;
}

async function claimWaitingMatch(
  opponent: MatchRow,
  player: ArenaPlayer,
  ownWaitingMatchId?: string,
) {
  const startsAt = Date.now() + 5_000;
  const state = pairPlayers(createInitialArenaState(), {
    hostId: opponent.playerOne.id,
    matchId: opponent.id,
    players: [opponent.playerOne, player],
    seed: crypto.randomUUID(),
    startsAt,
  });
  const db = getDb();
  const pairUpdate = db
    .update(arenaMatches)
    .set({
      playerTwo: player,
      playerTwoClerkUserId: player.userId,
      state,
      status: "active",
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(arenaMatches.id, opponent.id),
        eq(arenaMatches.status, "waiting"),
        isNull(arenaMatches.playerTwoClerkUserId),
      ),
    )
    .returning();

  if (ownWaitingMatchId && ownWaitingMatchId !== opponent.id) {
    const [, paired] = await db.batch([
      db
        .update(arenaMatches)
        .set({ status: "cancelled", updatedAt: new Date() })
        .where(
          and(
            eq(arenaMatches.id, ownWaitingMatchId),
            eq(arenaMatches.status, "waiting"),
          ),
        ),
      pairUpdate,
    ]);
    return paired[0];
  }

  const paired = await pairUpdate;
  return paired[0];
}

export async function joinArenaQueue(roomCode: string, userId: string) {
  const membership = await getRoomMembership(roomCode, userId);
  if (!membership) throw new Error("ROOM_MEMBERSHIP_REQUIRED");
  const player = await loadArenaPlayer(membership.roomId, userId);
  if (!player.inventory.length) throw new Error("INVENTORY_REQUIRED");

  const existing = await findUserMatch(membership.roomId, userId);
  if (existing?.status === "active") return existing;

  const db = getDb();
  const opponentConditions = [
    eq(arenaMatches.roomId, membership.roomId),
    eq(arenaMatches.status, "waiting"),
    ne(arenaMatches.playerOneClerkUserId, userId),
    isNull(arenaMatches.playerTwoClerkUserId),
  ];
  if (existing) {
    opponentConditions.push(
      or(
        lt(arenaMatches.createdAt, existing.createdAt),
        and(
          eq(arenaMatches.createdAt, existing.createdAt),
          lt(arenaMatches.id, existing.id),
        ),
      )!,
    );
  }

  const [opponent] = await db
    .select()
    .from(arenaMatches)
    .where(and(...opponentConditions))
    .orderBy(asc(arenaMatches.createdAt), asc(arenaMatches.id))
    .limit(1);

  if (opponent) {
    const paired = await claimWaitingMatch(opponent, player, existing?.id);
    if (paired) return paired;
  }

  if (existing) {
    const [refreshed] = await db
      .update(arenaMatches)
      .set({ playerOne: player, updatedAt: new Date() })
      .where(and(eq(arenaMatches.id, existing.id), eq(arenaMatches.status, "waiting")))
      .returning();
    if (refreshed) return refreshed;
  }

  const matchId = crypto.randomUUID();
  const [created] = await db
    .insert(arenaMatches)
    .values({
      id: matchId,
      playerOne: player,
      playerOneClerkUserId: userId,
      roomId: membership.roomId,
      state: waitingState(matchId),
    })
    .returning();
  return created;
}

export async function getArenaMatch(matchId: string, userId: string) {
  const [match] = await getDb()
    .select()
    .from(arenaMatches)
    .where(
      and(
        eq(arenaMatches.id, matchId),
        or(
          eq(arenaMatches.playerOneClerkUserId, userId),
          eq(arenaMatches.playerTwoClerkUserId, userId),
        ),
      ),
    )
    .limit(1);
  if (!match) throw new Error("MATCH_NOT_FOUND");
  return advanceArenaMatch(match);
}

async function advanceArenaMatch(match: MatchRow) {
  let state = match.state;
  if (state.phase === "countdown" && state.phaseEndsAt && state.phaseEndsAt <= Date.now()) {
    state = beginRound(state);
  } else if (state.phase === "memory-flash" && state.phaseEndsAt && state.phaseEndsAt <= Date.now()) {
    state = finishMemoryFlash(state);
  }
  if (state === match.state) return match;

  const [updated] = await getDb()
    .update(arenaMatches)
    .set({
      state,
      status: state.phase === "match-end" ? "complete" : match.status,
      updatedAt: new Date(),
    })
    .where(eq(arenaMatches.id, match.id))
    .returning();
  return updated ?? { ...match, state };
}

export async function recordArenaHit(matchId: string, userId: string, round: number) {
  const match = await getArenaMatch(matchId, userId);
  if (!isParticipant(match, userId) || match.state.phase !== "round" || match.state.round !== round) {
    return match;
  }
  const state = resolveRound(match.state, userId, Date.now());
  const [updated] = await getDb()
    .update(arenaMatches)
    .set({ state, updatedAt: new Date() })
    .where(
      and(
        eq(arenaMatches.id, match.id),
        eq(arenaMatches.status, "active"),
        sql`${arenaMatches.state}->>'phase' = 'round'`,
        sql`(${arenaMatches.state}->>'round')::integer = ${round}`,
      ),
    )
    .returning();
  return updated ?? getArenaMatch(matchId, userId);
}

export async function leaveArenaMatch(matchId: string, userId: string) {
  const match = await getArenaMatch(matchId, userId);
  if (match.status === "waiting") {
    const [cancelled] = await getDb()
      .update(arenaMatches)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(
        and(
          eq(arenaMatches.id, match.id),
          eq(arenaMatches.playerOneClerkUserId, userId),
          eq(arenaMatches.status, "waiting"),
        ),
      )
      .returning();
    return cancelled ?? match;
  }
  if (match.status !== "active") return match;

  const state = forfeitMatch(match.state, userId);
  const [completed] = await getDb()
    .update(arenaMatches)
    .set({ state, status: "complete", updatedAt: new Date() })
    .where(and(eq(arenaMatches.id, match.id), eq(arenaMatches.status, "active")))
    .returning();
  return completed ?? match;
}

export function publicMatch(match: MatchRow) {
  return { matchId: match.id, state: match.state, status: match.status };
}
