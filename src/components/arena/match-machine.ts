import {
  ARENA_MATCH_CONFIG,
  type ArenaItem,
  type ArenaMatchState,
  type ArenaPlayer,
  type EquippedItems,
} from "./arena-types";

export function createInitialArenaState(): ArenaMatchState {
  return {
    phase: "preloading",
    players: null,
    matchId: null,
    hostId: null,
    seed: null,
    round: 0,
    scores: {},
    equipped: {},
    phaseEndsAt: null,
    eliminatedPlayerId: null,
    eliminatedItem: null,
    winnerId: null,
    resultReason: null,
  };
}

function hash(value: string) {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function pick<T>(values: T[], seed: string) {
  if (!values.length) return undefined;
  return values[hash(seed) % values.length];
}

function itemKey(item: ArenaItem) {
  return item.name.trim().toLocaleLowerCase();
}

function pickRoundItems(
  players: [ArenaPlayer, ArenaPlayer],
  round: number,
  seed: string,
  previous: EquippedItems,
) {
  if (round === 1) {
    return Object.fromEntries(
      players.map((player) => [
        player.id,
        pick(player.inventory, `${seed}:round-1:${player.id}`),
      ]).filter((entry): entry is [string, ArenaItem] => Boolean(entry[1])),
    );
  }

  const secondPlayerKeys = new Set(players[1].inventory.map(itemKey));
  const sharedKeys = Array.from(
    new Set(players[0].inventory.map(itemKey).filter((key) => secondPlayerKeys.has(key))),
  );
  const selectedKey = pick(sharedKeys, `${seed}:round-${round}:shared`);

  if (!selectedKey) return previous;

  return Object.fromEntries(
    players.map((player) => {
      const matchingItems = player.inventory.filter((item) => itemKey(item) === selectedKey);
      return [player.id, pick(matchingItems, `${seed}:round-${round}:${player.id}`)];
    }).filter((entry): entry is [string, ArenaItem] => Boolean(entry[1])),
  );
}

export function markPreloadComplete(state: ArenaMatchState): ArenaMatchState {
  return { ...state, phase: "waiting" };
}

export function pairPlayers(
  state: ArenaMatchState,
  input: {
    hostId: string;
    matchId: string;
    players: [ArenaPlayer, ArenaPlayer];
    seed: string;
    startsAt: number;
  },
): ArenaMatchState {
  return {
    ...state,
    phase: "countdown",
    players: input.players,
    matchId: input.matchId,
    hostId: input.hostId,
    seed: input.seed,
    scores: Object.fromEntries(input.players.map((player) => [player.id, 0])),
    phaseEndsAt: input.startsAt,
  };
}

export function beginRound(state: ArenaMatchState): ArenaMatchState {
  if (!state.players || !state.seed) return state;
  const round = state.round + 1;
  return {
    ...state,
    phase: "round",
    round,
    equipped: pickRoundItems(state.players, round, state.seed, state.equipped),
    phaseEndsAt: null,
    eliminatedPlayerId: null,
    eliminatedItem: null,
  };
}

export function resolveRound(
  state: ArenaMatchState,
  killerId: string,
  resolvedAt: number,
): ArenaMatchState {
  if (state.phase !== "round" || !state.players) return state;
  const eliminatedPlayer = state.players.find((player) => player.id !== killerId);
  if (!eliminatedPlayer || !(killerId in state.scores)) return state;

  const scores = { ...state.scores, [killerId]: state.scores[killerId] + 1 };
  const winnerId = scores[killerId] >= ARENA_MATCH_CONFIG.roundsToWin ? killerId : null;

  return {
    ...state,
    phase: "memory-flash",
    scores,
    phaseEndsAt: resolvedAt + ARENA_MATCH_CONFIG.roundBreakMs,
    eliminatedPlayerId: eliminatedPlayer.id,
    eliminatedItem: state.equipped[eliminatedPlayer.id] ?? null,
    winnerId,
    resultReason: winnerId ? "score" : null,
  };
}

export function finishMemoryFlash(state: ArenaMatchState): ArenaMatchState {
  if (state.phase !== "memory-flash") return state;
  if (state.winnerId) {
    return { ...state, phase: "match-end", phaseEndsAt: null };
  }
  return beginRound(state);
}

export function forfeitMatch(
  state: ArenaMatchState,
  departedPlayerId: string,
): ArenaMatchState {
  if (!state.players || state.phase === "match-end") return state;
  const winner = state.players.find((player) => player.id !== departedPlayerId);
  if (!winner) return state;
  return {
    ...state,
    phase: "match-end",
    winnerId: winner.id,
    resultReason: "forfeit",
    phaseEndsAt: null,
  };
}
