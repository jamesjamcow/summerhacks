import { createHmac, timingSafeEqual } from "node:crypto";

export type ArenaResultPlayer = {
  name: string;
  score: number;
  userId: string;
};

export type ArenaResultPayload = {
  completedAt: number;
  matchId: string;
  players: ArenaResultPlayer[];
  resultReason: "score" | "forfeit";
  roomCode: string;
  roomId: string;
  version: 1;
  winnerId: string;
};

function receiptSecret() {
  const secret = process.env.ARENA_TICKET_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret || secret.length < 24) {
    throw new Error("ARENA_TICKET_SECRET must contain at least 24 characters.");
  }
  return secret;
}

function signature(value: string) {
  return createHmac("sha256", receiptSecret()).update(value).digest("base64url");
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isUuid(value: unknown) {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function isResultPlayer(value: unknown): value is ArenaResultPlayer {
  if (!value || typeof value !== "object") return false;
  const player = value as Record<string, unknown>;
  return text(player.userId, 128) &&
    text(player.name, 100) &&
    typeof player.score === "number" &&
    Number.isSafeInteger(player.score) &&
    player.score >= 0 &&
    player.score <= 255;
}

function isResultPayload(value: unknown): value is ArenaResultPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  if (
    payload.version !== 1 ||
    !isUuid(payload.matchId) ||
    !isUuid(payload.roomId) ||
    typeof payload.roomCode !== "string" ||
    !/^[A-Z0-9]{1,8}$/.test(payload.roomCode) ||
    !Array.isArray(payload.players) ||
    payload.players.length !== 2 ||
    !payload.players.every(isResultPlayer) ||
    (payload.resultReason !== "score" && payload.resultReason !== "forfeit") ||
    !text(payload.winnerId, 128) ||
    typeof payload.completedAt !== "number" ||
    !Number.isSafeInteger(payload.completedAt)
  ) {
    return false;
  }

  const players = payload.players as ArenaResultPlayer[];
  const playerIds = new Set(players.map((player) => player.userId));
  return playerIds.size === 2 && playerIds.has(payload.winnerId as string);
}

export function createArenaResultReceipt(payload: ArenaResultPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

export function verifyArenaResultReceipt(receipt: string) {
  const [encoded, suppliedSignature, extra] = receipt.split(".");
  if (!encoded || !suppliedSignature || extra) throw new Error("INVALID_ARENA_RESULT");

  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("INVALID_ARENA_RESULT");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("INVALID_ARENA_RESULT");
  }
  if (!isResultPayload(payload)) throw new Error("INVALID_ARENA_RESULT");

  const maximumAge = 24 * 60 * 60 * 1_000;
  if (payload.completedAt < Date.now() - maximumAge || payload.completedAt > Date.now() + 60_000) {
    throw new Error("EXPIRED_ARENA_RESULT");
  }
  return payload;
}
