export type AbilityId = string;
export type ItemId = string;
export type CharacterId = string;

export interface Ability {
  id: AbilityId;
  name: string;
  damage: number;
  useCase: string;
  cooldownTurns?: number;
}

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

export interface BattleParticipant {
  slot: ParticipantSlot;
  characterId: CharacterId;
  maxHealth: number;
  currentHealth: number;
  selectedItemIds: ItemId[];
  cooldowns: Record<ItemId, number>;
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
  type: "USE_ITEM" | "FORFEIT";
  actorSlot: ParticipantSlot;
  itemId?: ItemId;
}

export type BattleEventType =
  | "DAMAGE_DEALT"
  | "ITEM_ON_COOLDOWN"
  | "BATTLE_ENDED"
  | "INVALID_ACTION";

export interface BattleEvent {
  type: BattleEventType;
  payload: unknown;
}

export interface CharacterWithItems {
  character: Character;
  selectedItemIds: ItemId[];
}
