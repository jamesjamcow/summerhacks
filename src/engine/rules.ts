import { Ability } from "./types";

export const DEFAULT_MAX_HEALTH = 100;
export const MAX_ITEMS_PER_BATTLE = 4;

// Cooldown scales with an ability's "power" (see abilityPower below): every
// DAMAGE_PER_COOLDOWN_TURN points of power locks the item out for one more
// turn, with a 1-turn floor. These weights are hackathon balance constants —
// tune freely.
export const DAMAGE_PER_COOLDOWN_TURN = 10;
export const MIN_COOLDOWN_TURNS = 1;
export const STUN_POWER_PER_TURN = 30;
export const PERCENT_EFFECT_POWER_SCALE = 100;

export function otherSlot(slot: "player" | "opponent"): "player" | "opponent" {
  return slot === "player" ? "opponent" : "player";
}

export function clampHealth(health: number, maxHealth: number): number {
  return Math.max(0, Math.min(maxHealth, health));
}

export function computeCooldownTurns(power: number): number {
  return Math.max(MIN_COOLDOWN_TURNS, Math.round(power / DAMAGE_PER_COOLDOWN_TURN));
}

// Reduces any ability category to a single "intensity" number so cooldown
// scaling can apply uniformly across categories.
export function abilityPower(ability: Ability): number {
  switch (ability.category) {
    case "strike":
      return ability.damage;
    case "poison":
      return ability.damage + ability.poisonDamagePerTurn * ability.durationTurns;
    case "heal":
      return ability.healAmount;
    case "shield":
      return ability.shieldAmount;
    case "buff":
    case "debuff":
      return Math.abs(1 - ability.damageMultiplier) * PERCENT_EFFECT_POWER_SCALE;
    case "stun":
      return ability.durationTurns * STUN_POWER_PER_TURN;
  }
}
