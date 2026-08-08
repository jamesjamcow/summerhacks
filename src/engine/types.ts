export type AbilityId = string;
export type ItemId = string;
export type CharacterId = string;

export type AbilityCategory =
  | "strike"
  | "poison"
  | "buff"
  | "debuff"
  | "heal"
  | "shield"
  | "stun";

interface AbilityBase {
  id: AbilityId;
  name: string;
  useCase: string;
}

export type Ability =
  | (AbilityBase & { category: "strike"; damage: number })
  | (AbilityBase & {
      category: "poison";
      damage: number;
      poisonDamagePerTurn: number;
      durationTurns: number;
    })
  | (AbilityBase & {
      category: "buff";
      damageMultiplier: number;
      durationTurns: number;
    })
  | (AbilityBase & {
      category: "debuff";
      damageMultiplier: number;
      durationTurns: number;
    })
  | (AbilityBase & { category: "heal"; healAmount: number })
  | (AbilityBase & {
      category: "shield";
      shieldAmount: number;
      durationTurns: number;
    })
  | (AbilityBase & { category: "stun"; durationTurns: number });

export interface Item {
  id: ItemId;
  name: string;
  spriteKey: string;
  ability: Ability;
  sourceMemory?: {
    photoUrl?: string;
    friendName?: string;
  };
}

export interface Inventory {
  characterId: CharacterId;
  items: Item[];
}

export interface Character {
  id: CharacterId;
  displayName: string;
  maxHealth: number;
  inventory: Inventory;
}

export type ParticipantSlot = "player" | "opponent";

export type StatusEffectKind = "poison" | "buff" | "debuff" | "shield" | "stun";

export interface StatusEffect {
  kind: StatusEffectKind;
  remainingTurns: number;
  // poison: damage per tick. buff/debuff: damage multiplier. shield: remaining absorb amount. stun: unused (0).
  magnitude: number;
}

export interface BattleParticipant {
  slot: ParticipantSlot;
  characterId: CharacterId;
  maxHealth: number;
  currentHealth: number;
  selectedItemIds: ItemId[];
  cooldowns: Record<ItemId, number>;
  statusEffects: StatusEffect[];
}

export interface BattleLogEntry {
  turn: number;
  actorSlot: ParticipantSlot;
  itemId: ItemId;
  damageDealt: number;
  targetHealthAfter: number;
}

export type BattleStatus = "in_progress" | "won" | "lost" | "draw";

export interface BattleState {
  battleId: string;
  status: BattleStatus;
  turnNumber: number;
  activeSlot: ParticipantSlot;
  participants: Record<ParticipantSlot, BattleParticipant>;
  log: BattleLogEntry[];
}

export interface BattleAction {
  type: "USE_ITEM" | "FORFEIT" | "SKIP_TURN";
  actorSlot: ParticipantSlot;
  itemId?: ItemId;
}

export type BattleEventType =
  | "DAMAGE_DEALT"
  | "ITEM_ON_COOLDOWN"
  | "BATTLE_ENDED"
  | "INVALID_ACTION"
  | "HEAL_APPLIED"
  | "BUFF_APPLIED"
  | "DEBUFF_APPLIED"
  | "SHIELD_APPLIED"
  | "SHIELD_ABSORBED"
  | "STUN_APPLIED"
  | "POISON_APPLIED"
  | "POISON_TICK"
  | "TURN_SKIPPED";

export interface BattleEvent {
  type: BattleEventType;
  payload: unknown;
}

export interface CharacterWithItems {
  character: Character;
  selectedItemIds: ItemId[];
}
