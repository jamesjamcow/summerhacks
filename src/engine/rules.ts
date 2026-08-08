export const DEFAULT_MAX_HEALTH = 100;
export const MAX_ITEMS_PER_BATTLE = 4;

export function otherSlot(slot: "player" | "opponent"): "player" | "opponent" {
  return slot === "player" ? "opponent" : "player";
}

export function clampHealth(health: number, maxHealth: number): number {
  return Math.max(0, Math.min(maxHealth, health));
}
