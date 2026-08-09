export type ArenaItem = {
  id: string;
  modelUrl?: string;
  imageUrl?: string;
  memoryLabel: string;
  name: string;
};

export type ArenaPlayer = {
  avatarUrl?: string;
  id: string;
  inventory: ArenaItem[];
  name: string;
  userId: string;
};

export type EquippedItems = Record<string, ArenaItem>;

export type ArenaPhase =
  | "preloading"
  | "waiting"
  | "countdown"
  | "round"
  | "memory-flash"
  | "match-end";

export type ArenaMatchState = {
  phase: ArenaPhase;
  players: [ArenaPlayer, ArenaPlayer] | null;
  matchId: string | null;
  hostId: string | null;
  seed: string | null;
  round: number;
  scores: Record<string, number>;
  equipped: EquippedItems;
  phaseEndsAt: number | null;
  eliminatedPlayerId: string | null;
  eliminatedItem: ArenaItem | null;
  winnerId: string | null;
  resultReason: "score" | "forfeit" | null;
};

export type ArenaMatchConfig = {
  countdownMs: number;
  flashAudience: "eliminated" | "both";
  noSharedItems: "keep-previous";
  roundBreakMs: number;
  roundsToWin: number;
};

export const ARENA_MATCH_CONFIG: ArenaMatchConfig = {
  countdownMs: 5_000,
  flashAudience: "eliminated",
  noSharedItems: "keep-previous",
  roundBreakMs: 5_000,
  roundsToWin: 3,
};
