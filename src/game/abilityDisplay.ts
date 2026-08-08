import { Ability, AbilityCategory } from "@/engine/types";

export const CATEGORY_COLORS: Record<AbilityCategory, number> = {
  strike: 0xe0e0e0,
  poison: 0x7ac74f,
  buff: 0xffcc4d,
  debuff: 0xc06cd9,
  heal: 0xff8fa3,
  shield: 0x4db8ff,
  stun: 0xffe066,
};

export function categoryColorHex(category: AbilityCategory): string {
  return `#${CATEGORY_COLORS[category].toString(16).padStart(6, "0")}`;
}

export function formatAbilitySummary(ability: Ability): string {
  switch (ability.category) {
    case "strike":
      return `${ability.damage} dmg`;
    case "poison":
      return `${ability.damage} dmg + ${ability.poisonDamagePerTurn}/turn x${ability.durationTurns}`;
    case "buff":
      return `x${ability.damageMultiplier} dmg (${ability.durationTurns}t)`;
    case "debuff":
      return `enemy x${ability.damageMultiplier} dmg (${ability.durationTurns}t)`;
    case "heal":
      return `+${ability.healAmount} hp`;
    case "shield":
      return `+${ability.shieldAmount} shield (${ability.durationTurns}t)`;
    case "stun":
      return `stun ${ability.durationTurns}t`;
  }
}
