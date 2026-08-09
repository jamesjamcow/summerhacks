import { createHmac, timingSafeEqual } from "node:crypto";

export type ArenaTicketItem = {
  id: string;
  name: string;
  memoryLabel: string;
  imageUrl?: string;
  modelUrl?: string;
  originalImageUrl?: string;
};

export type ArenaTicketPayload = {
  version: 1;
  userId: string;
  name: string;
  avatarImageUrl?: string;
  avatarModelUrl?: string;
  roomCode: string;
  roomId: string;
  inventory: ArenaTicketItem[];
  expiresAt: number;
  nonce: string;
};

function ticketSecret() {
  const secret = process.env.ARENA_TICKET_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret || secret.length < 24) {
    throw new Error("ARENA_TICKET_SECRET must contain at least 24 characters.");
  }
  return secret;
}

function signature(value: string) {
  return createHmac("sha256", ticketSecret()).update(value).digest("base64url");
}

export function createArenaTicket(payload: ArenaTicketPayload) {
  const encoded = Buffer.from(JSON.stringify(payload)).toString("base64url");
  return `${encoded}.${signature(encoded)}`;
}

function text(value: unknown, maximum: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

function isTicketItem(value: unknown): value is ArenaTicketItem {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  return text(item.id, 64) && text(item.name, 100) && text(item.memoryLabel, 300) &&
    (item.imageUrl === undefined || text(item.imageUrl, 2_048)) &&
    (item.modelUrl === undefined || text(item.modelUrl, 2_048)) &&
    (item.originalImageUrl === undefined || text(item.originalImageUrl, 2_048)) &&
    (Boolean(item.imageUrl) || Boolean(item.modelUrl));
}

function isTicketPayload(value: unknown): value is ArenaTicketPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Record<string, unknown>;
  return payload.version === 1 &&
    text(payload.userId, 128) &&
    text(payload.name, 100) &&
    (payload.avatarImageUrl === undefined || text(payload.avatarImageUrl, 2_048)) &&
    (payload.avatarModelUrl === undefined || text(payload.avatarModelUrl, 2_048)) &&
    typeof payload.roomCode === "string" && /^[A-Z0-9]{1,8}$/.test(payload.roomCode) &&
    text(payload.roomId, 64) &&
    Array.isArray(payload.inventory) &&
    payload.inventory.length > 0 &&
    payload.inventory.length <= 6 &&
    payload.inventory.every(isTicketItem) &&
    typeof payload.expiresAt === "number" &&
    Number.isSafeInteger(payload.expiresAt) &&
    text(payload.nonce, 64);
}

export function verifyArenaTicket(token: string) {
  const [encoded, suppliedSignature, extra] = token.split(".");
  if (!encoded || !suppliedSignature || extra) throw new Error("INVALID_ARENA_TICKET");

  const expected = Buffer.from(signature(encoded));
  const supplied = Buffer.from(suppliedSignature);
  if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied)) {
    throw new Error("INVALID_ARENA_TICKET");
  }

  let payload: unknown;
  try {
    payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8"));
  } catch {
    throw new Error("INVALID_ARENA_TICKET");
  }
  if (!isTicketPayload(payload) || payload.expiresAt < Date.now()) {
    throw new Error("INVALID_ARENA_TICKET");
  }
  return payload;
}
