import {
  BattleAction,
  BattleEvent,
  BattleParticipant,
  BattleState,
  Character,
  Item,
  ParticipantSlot,
} from "./types";
import {
  DEFAULT_MAX_HEALTH,
  clampHealth,
  computeCooldownTurns,
  otherSlot,
} from "./rules";

function buildParticipant(
  slot: ParticipantSlot,
  character: Character,
  selectedItemIds: string[],
): BattleParticipant {
  return {
    slot,
    characterId: character.id,
    maxHealth: character.maxHealth ?? DEFAULT_MAX_HEALTH,
    currentHealth: character.maxHealth ?? DEFAULT_MAX_HEALTH,
    selectedItemIds: [...selectedItemIds],
    cooldowns: {},
  };
}

export function createBattle(
  battleId: string,
  playerCharacter: Character,
  opponentCharacter: Character,
  selectedItems: { player: string[]; opponent: string[] },
): BattleState {
  return {
    battleId,
    status: "in_progress",
    turnNumber: 1,
    activeSlot: "player",
    participants: {
      player: buildParticipant("player", playerCharacter, selectedItems.player),
      opponent: buildParticipant(
        "opponent",
        opponentCharacter,
        selectedItems.opponent,
      ),
    },
    log: [],
  };
}

function findItem(
  character: Character | undefined,
  itemId: string,
): Item | undefined {
  return character?.inventory.items.find((item) => item.id === itemId);
}

export interface ApplyActionContext {
  playerCharacter: Character;
  opponentCharacter: Character;
}

export function applyAction(
  state: BattleState,
  action: BattleAction,
  context: ApplyActionContext,
): { state: BattleState; events: BattleEvent[] } {
  if (state.status !== "in_progress") {
    return {
      state,
      events: [{ type: "INVALID_ACTION", payload: { reason: "battle_over" } }],
    };
  }

  if (action.actorSlot !== state.activeSlot) {
    return {
      state,
      events: [{ type: "INVALID_ACTION", payload: { reason: "not_your_turn" } }],
    };
  }

  if (action.type === "FORFEIT") {
    const winner = otherSlot(action.actorSlot);
    const nextState: BattleState = {
      ...state,
      status: winner === "player" ? "won" : "lost",
    };
    return {
      state: nextState,
      events: [
        { type: "BATTLE_ENDED", payload: { winner, reason: "forfeit" } },
      ],
    };
  }

  // USE_ITEM
  const actor = state.participants[action.actorSlot];
  const target = state.participants[otherSlot(action.actorSlot)];
  const itemId = action.itemId;

  if (!itemId || !actor.selectedItemIds.includes(itemId)) {
    return {
      state,
      events: [
        { type: "INVALID_ACTION", payload: { reason: "item_not_owned" } },
      ],
    };
  }

  const actorCharacter =
    action.actorSlot === "player" ? context.playerCharacter : context.opponentCharacter;
  const item = findItem(actorCharacter, itemId);

  if (!item) {
    return {
      state,
      events: [
        { type: "INVALID_ACTION", payload: { reason: "item_not_found" } },
      ],
    };
  }

  const decrementedCooldowns: Record<string, number> = {};
  for (const [id, turnsLeft] of Object.entries(actor.cooldowns)) {
    const next = turnsLeft - 1;
    if (next > 0) decrementedCooldowns[id] = next;
  }

  const remainingCooldown = decrementedCooldowns[itemId] ?? 0;
  if (remainingCooldown > 0) {
    return {
      state,
      events: [
        {
          type: "ITEM_ON_COOLDOWN",
          payload: { itemId, remainingCooldown },
        },
      ],
    };
  }

  const damageDealt = item.ability.damage;
  const targetHealthAfter = clampHealth(
    target.currentHealth - damageDealt,
    target.maxHealth,
  );

  const nextActor: BattleParticipant = {
    ...actor,
    cooldowns: {
      ...decrementedCooldowns,
      [itemId]: computeCooldownTurns(item.ability.damage),
    },
  };

  const nextTarget: BattleParticipant = {
    ...target,
    currentHealth: targetHealthAfter,
  };

  const events: BattleEvent[] = [
    {
      type: "DAMAGE_DEALT",
      payload: {
        actorSlot: action.actorSlot,
        targetSlot: target.slot,
        itemId,
        damageDealt,
        targetHealthAfter,
      },
    },
  ];

  const battleEnded = targetHealthAfter <= 0;
  const nextStatus = battleEnded
    ? action.actorSlot === "player"
      ? "won"
      : "lost"
    : "in_progress";

  if (battleEnded) {
    events.push({
      type: "BATTLE_ENDED",
      payload: { winner: action.actorSlot, reason: "knockout" },
    });
  }

  const nextState: BattleState = {
    ...state,
    status: nextStatus,
    turnNumber: state.turnNumber + 1,
    activeSlot: battleEnded ? state.activeSlot : otherSlot(state.activeSlot),
    participants: {
      ...state.participants,
      [action.actorSlot]: nextActor,
      [target.slot]: nextTarget,
    },
    log: [
      ...state.log,
      {
        turn: state.turnNumber,
        actorSlot: action.actorSlot,
        itemId,
        damageDealt,
        targetHealthAfter,
      },
    ],
  };

  return { state: nextState, events };
}
