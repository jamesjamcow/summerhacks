export const DEFAULT_MAX_HEALTH = 100;
export const MAX_ITEMS_PER_BATTLE = 4;

// Cooldown scales with how much damage an item deals: every DAMAGE_PER_COOLDOWN_TURN
// points of damage locks the item out for one more turn, with a 1-turn floor.
export const DAMAGE_PER_COOLDOWN_TURN = 10;
export const MIN_COOLDOWN_TURNS = 1;

export function otherSlot(slot: "player" | "opponent"): "player" | "opponent" {
  return slot === "player" ? "opponent" : "player";
}

export function clampHealth(health: number, maxHealth: number): number {
  return Math.max(0, Math.min(maxHealth, health));
}

export function computeCooldownTurns(damage: number): number {
  return Math.max(MIN_COOLDOWN_TURNS, Math.round(damage / DAMAGE_PER_COOLDOWN_TURN));
}
