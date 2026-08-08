import {
  Ability,
  BattleAction,
  BattleEvent,
  BattleParticipant,
  BattleState,
  Character,
  Item,
  ParticipantSlot,
  StatusEffect,
  StatusEffectKind,
} from "./types";
import {
  DEFAULT_MAX_HEALTH,
  abilityPower,
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
    statusEffects: [],
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

function getStatus(
  participant: BattleParticipant,
  kind: StatusEffectKind,
): StatusEffect | undefined {
  return participant.statusEffects.find((effect) => effect.kind === kind);
}

function upsertStatus(
  effects: StatusEffect[],
  next: StatusEffect,
): StatusEffect[] {
  return [...effects.filter((effect) => effect.kind !== next.kind), next];
}

function removeStatus(
  effects: StatusEffect[],
  kind: StatusEffectKind,
): StatusEffect[] {
  return effects.filter((effect) => effect.kind !== kind);
}

/**
 * Applies poison damage at the start of the actor's turn (before they act),
 * decrementing/removing the poison effect. Returns whether this killed them.
 */
function applyPoisonTick(participant: BattleParticipant): {
  participant: BattleParticipant;
  events: BattleEvent[];
  died: boolean;
} {
  const poison = getStatus(participant, "poison");
  if (!poison) {
    return { participant, events: [], died: false };
  }

  const healthAfter = clampHealth(
    participant.currentHealth - poison.magnitude,
    participant.maxHealth,
  );
  const remainingTurns = poison.remainingTurns - 1;
  const nextEffects =
    remainingTurns > 0
      ? upsertStatus(participant.statusEffects, { ...poison, remainingTurns })
      : removeStatus(participant.statusEffects, "poison");

  return {
    participant: {
      ...participant,
      currentHealth: healthAfter,
      statusEffects: nextEffects,
    },
    events: [
      {
        type: "POISON_TICK",
        payload: {
          slot: participant.slot,
          damage: poison.magnitude,
          healthAfter,
        },
      },
    ],
    died: healthAfter <= 0,
  };
}

/**
 * Decrements duration on the participant's own buff/debuff/shield effects by
 * one turn (their upkeep), removing any that expire. Does not touch newly
 * applied effects from the current action.
 */
function decrementOwnDurations(participant: BattleParticipant): BattleParticipant {
  const nextEffects = participant.statusEffects
    .filter((effect) => effect.kind === "buff" || effect.kind === "debuff" || effect.kind === "shield")
    .map((effect) => ({ ...effect, remainingTurns: effect.remainingTurns - 1 }))
    .filter((effect) => effect.remainingTurns > 0);

  const untouched = participant.statusEffects.filter(
    (effect) => effect.kind !== "buff" && effect.kind !== "debuff" && effect.kind !== "shield",
  );

  return { ...participant, statusEffects: [...untouched, ...nextEffects] };
}

/**
 * Decrements the actor's stun duration (consumed only via SKIP_TURN, since a
 * stunned actor's USE_ITEM attempts are rejected before ever reaching here).
 */
function decrementStunDuration(participant: BattleParticipant): BattleParticipant {
  const stun = getStatus(participant, "stun");
  if (!stun) return participant;

  const remainingTurns = stun.remainingTurns - 1;
  const nextEffects =
    remainingTurns > 0
      ? upsertStatus(participant.statusEffects, { ...stun, remainingTurns })
      : removeStatus(participant.statusEffects, "stun");

  return { ...participant, statusEffects: nextEffects };
}

function getMultiplier(participant: BattleParticipant, kind: "buff" | "debuff"): number {
  return getStatus(participant, kind)?.magnitude ?? 1;
}

export interface ApplyActionContext {
  playerCharacter: Character;
  opponentCharacter: Character;
}

interface DamageResolution {
  actor: BattleParticipant;
  target: BattleParticipant;
  damageDealt: number;
  events: BattleEvent[];
}

function resolveAbilityEffect(
  ability: Ability,
  actor: BattleParticipant,
  target: BattleParticipant,
): DamageResolution {
  switch (ability.category) {
    case "strike":
    case "poison": {
      const rawDamage = ability.damage;
      const buffMultiplier = getMultiplier(actor, "buff");
      const debuffMultiplier = getMultiplier(actor, "debuff");
      const finalDamage = Math.max(
        0,
        Math.round(rawDamage * buffMultiplier * debuffMultiplier),
      );

      const shield = getStatus(target, "shield");
      const absorbed = Math.min(finalDamage, shield?.magnitude ?? 0);
      const remainder = finalDamage - absorbed;
      const targetHealthAfter = clampHealth(
        target.currentHealth - remainder,
        target.maxHealth,
      );

      let targetEffects = target.statusEffects;
      const events: BattleEvent[] = [];

      if (shield) {
        const shieldMagnitudeAfter = shield.magnitude - absorbed;
        targetEffects =
          shieldMagnitudeAfter > 0
            ? upsertStatus(targetEffects, { ...shield, magnitude: shieldMagnitudeAfter })
            : removeStatus(targetEffects, "shield");
        if (absorbed > 0) {
          events.push({
            type: "SHIELD_ABSORBED",
            payload: { targetSlot: target.slot, absorbed, shieldRemaining: Math.max(0, shieldMagnitudeAfter) },
          });
        }
      }

      events.push({
        type: "DAMAGE_DEALT",
        payload: {
          actorSlot: actor.slot,
          targetSlot: target.slot,
          itemId: ability.id,
          damageDealt: remainder,
          targetHealthAfter,
        },
      });

      let nextTarget: BattleParticipant = {
        ...target,
        currentHealth: targetHealthAfter,
        statusEffects: targetEffects,
      };

      if (ability.category === "poison") {
        nextTarget = {
          ...nextTarget,
          statusEffects: upsertStatus(nextTarget.statusEffects, {
            kind: "poison",
            remainingTurns: ability.durationTurns,
            magnitude: ability.poisonDamagePerTurn,
          }),
        };
        events.push({
          type: "POISON_APPLIED",
          payload: { targetSlot: target.slot, damagePerTurn: ability.poisonDamagePerTurn, durationTurns: ability.durationTurns },
        });
      }

      return { actor, target: nextTarget, damageDealt: remainder, events };
    }

    case "buff": {
      const nextActor: BattleParticipant = {
        ...actor,
        statusEffects: upsertStatus(actor.statusEffects, {
          kind: "buff",
          remainingTurns: ability.durationTurns,
          magnitude: ability.damageMultiplier,
        }),
      };
      return {
        actor: nextActor,
        target,
        damageDealt: 0,
        events: [
          {
            type: "BUFF_APPLIED",
            payload: { slot: actor.slot, damageMultiplier: ability.damageMultiplier, durationTurns: ability.durationTurns },
          },
        ],
      };
    }

    case "debuff": {
      const nextTarget: BattleParticipant = {
        ...target,
        statusEffects: upsertStatus(target.statusEffects, {
          kind: "debuff",
          remainingTurns: ability.durationTurns,
          magnitude: ability.damageMultiplier,
        }),
      };
      return {
        actor,
        target: nextTarget,
        damageDealt: 0,
        events: [
          {
            type: "DEBUFF_APPLIED",
            payload: { slot: target.slot, damageMultiplier: ability.damageMultiplier, durationTurns: ability.durationTurns },
          },
        ],
      };
    }

    case "heal": {
      const healthAfter = clampHealth(actor.currentHealth + ability.healAmount, actor.maxHealth);
      const nextActor: BattleParticipant = { ...actor, currentHealth: healthAfter };
      return {
        actor: nextActor,
        target,
        damageDealt: 0,
        events: [
          { type: "HEAL_APPLIED", payload: { slot: actor.slot, healedAmount: healthAfter - actor.currentHealth, healthAfter } },
        ],
      };
    }

    case "shield": {
      const nextActor: BattleParticipant = {
        ...actor,
        statusEffects: upsertStatus(actor.statusEffects, {
          kind: "shield",
          remainingTurns: ability.durationTurns,
          magnitude: ability.shieldAmount,
        }),
      };
      return {
        actor: nextActor,
        target,
        damageDealt: 0,
        events: [
          {
            type: "SHIELD_APPLIED",
            payload: { slot: actor.slot, shieldAmount: ability.shieldAmount, durationTurns: ability.durationTurns },
          },
        ],
      };
    }

    case "stun": {
      const nextTarget: BattleParticipant = {
        ...target,
        statusEffects: upsertStatus(target.statusEffects, {
          kind: "stun",
          remainingTurns: ability.durationTurns,
          magnitude: 0,
        }),
      };
      return {
        actor,
        target: nextTarget,
        damageDealt: 0,
        events: [
          { type: "STUN_APPLIED", payload: { slot: target.slot, durationTurns: ability.durationTurns } },
        ],
      };
    }
  }
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
      events: [{ type: "BATTLE_ENDED", payload: { winner, reason: "forfeit" } }],
    };
  }

  const originalActor = state.participants[action.actorSlot];
  const originalTarget = state.participants[otherSlot(action.actorSlot)];
  const isStunned = Boolean(getStatus(originalActor, "stun"));

  if (action.type === "USE_ITEM") {
    if (isStunned) {
      return {
        state,
        events: [{ type: "INVALID_ACTION", payload: { reason: "stunned" } }],
      };
    }

    const itemId = action.itemId;
    if (!itemId || !originalActor.selectedItemIds.includes(itemId)) {
      return {
        state,
        events: [{ type: "INVALID_ACTION", payload: { reason: "item_not_owned" } }],
      };
    }

    const actorCharacter =
      action.actorSlot === "player" ? context.playerCharacter : context.opponentCharacter;
    const item = findItem(actorCharacter, itemId);
    if (!item) {
      return {
        state,
        events: [{ type: "INVALID_ACTION", payload: { reason: "item_not_found" } }],
      };
    }

    const decrementedCooldowns: Record<string, number> = {};
    for (const [id, turnsLeft] of Object.entries(originalActor.cooldowns)) {
      const next = turnsLeft - 1;
      if (next > 0) decrementedCooldowns[id] = next;
    }

    const remainingCooldown = decrementedCooldowns[itemId] ?? 0;
    if (remainingCooldown > 0) {
      return {
        state,
        events: [{ type: "ITEM_ON_COOLDOWN", payload: { itemId, remainingCooldown } }],
      };
    }

    // Validation passed — now commit: poison tick, then this action's effect.
    const { participant: tickedActor, events: tickEvents, died } = applyPoisonTick(originalActor);

    if (died) {
      const winner = otherSlot(action.actorSlot);
      const nextState: BattleState = {
        ...state,
        status: winner === "player" ? "won" : "lost",
        participants: { ...state.participants, [action.actorSlot]: tickedActor },
      };
      return {
        state: nextState,
        events: [...tickEvents, { type: "BATTLE_ENDED", payload: { winner, reason: "poison" } }],
      };
    }

    const durationDecrementedActor = decrementOwnDurations(tickedActor);
    const resolution = resolveAbilityEffect(item.ability, durationDecrementedActor, originalTarget);

    const nextActor: BattleParticipant = {
      ...resolution.actor,
      cooldowns: {
        ...decrementedCooldowns,
        [itemId]: computeCooldownTurns(abilityPower(item.ability)),
      },
    };
    const nextTarget = resolution.target;

    const battleEnded = nextTarget.currentHealth <= 0;
    const nextStatus = battleEnded
      ? action.actorSlot === "player"
        ? "won"
        : "lost"
      : "in_progress";

    const events: BattleEvent[] = [...tickEvents, ...resolution.events];
    if (battleEnded) {
      events.push({ type: "BATTLE_ENDED", payload: { winner: action.actorSlot, reason: "knockout" } });
    }

    const nextState: BattleState = {
      ...state,
      status: nextStatus,
      turnNumber: state.turnNumber + 1,
      activeSlot: battleEnded ? state.activeSlot : otherSlot(state.activeSlot),
      participants: {
        ...state.participants,
        [action.actorSlot]: nextActor,
        [nextTarget.slot]: nextTarget,
      },
      log: [
        ...state.log,
        {
          turn: state.turnNumber,
          actorSlot: action.actorSlot,
          itemId,
          damageDealt: resolution.damageDealt,
          targetHealthAfter: nextTarget.currentHealth,
        },
      ],
    };

    return { state: nextState, events };
  }

  // SKIP_TURN — always legal on your own turn. Still resolves start-of-turn
  // effects (poison damage, stun countdown) since the turn is being consumed.
  const { participant: tickedActor, events: tickEvents, died } = applyPoisonTick(originalActor);
  const settledActor = decrementStunDuration(decrementOwnDurations(tickedActor));

  if (died) {
    const winner = otherSlot(action.actorSlot);
    const nextState: BattleState = {
      ...state,
      status: winner === "player" ? "won" : "lost",
      participants: { ...state.participants, [action.actorSlot]: settledActor },
    };
    return {
      state: nextState,
      events: [...tickEvents, { type: "BATTLE_ENDED", payload: { winner, reason: "poison" } }],
    };
  }

  const nextState: BattleState = {
    ...state,
    turnNumber: state.turnNumber + 1,
    activeSlot: otherSlot(state.activeSlot),
    participants: { ...state.participants, [action.actorSlot]: settledActor },
  };

  return {
    state: nextState,
    events: [...tickEvents, { type: "TURN_SKIPPED", payload: { slot: action.actorSlot } }],
  };
}
