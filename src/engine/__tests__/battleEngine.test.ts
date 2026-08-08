import { describe, expect, it } from "vitest";
import { applyAction, createBattle } from "../battleEngine";
import { abilityPower, computeCooldownTurns } from "../rules";
import { Ability, Character } from "../types";

function makeCharacter(id: string, displayName: string, ability: Ability): Character {
  return {
    id,
    displayName,
    maxHealth: 100,
    inventory: {
      characterId: id,
      items: [
        {
          id: `${id}-item-1`,
          name: "Test Item",
          spriteKey: "placeholder",
          ability,
        },
      ],
    },
  };
}

function makeCharacterWithItems(id: string, displayName: string, abilities: Ability[]): Character {
  return {
    id,
    displayName,
    maxHealth: 100,
    inventory: {
      characterId: id,
      items: abilities.map((ability, index) => ({
        id: `${id}-item-${index + 1}`,
        name: `Test Item ${index + 1}`,
        spriteKey: "placeholder",
        ability,
      })),
    },
  };
}

const strike = (damage: number): Ability => ({
  id: "ability-strike",
  name: "Strike",
  category: "strike",
  useCase: "test strike",
  damage,
});

const poison = (damage: number, poisonDamagePerTurn: number, durationTurns: number): Ability => ({
  id: "ability-poison",
  name: "Poison",
  category: "poison",
  useCase: "test poison",
  damage,
  poisonDamagePerTurn,
  durationTurns,
});

const buff = (damageMultiplier: number, durationTurns: number): Ability => ({
  id: "ability-buff",
  name: "Buff",
  category: "buff",
  useCase: "test buff",
  damageMultiplier,
  durationTurns,
});

const debuff = (damageMultiplier: number, durationTurns: number): Ability => ({
  id: "ability-debuff",
  name: "Debuff",
  category: "debuff",
  useCase: "test debuff",
  damageMultiplier,
  durationTurns,
});

const heal = (healAmount: number): Ability => ({
  id: "ability-heal",
  name: "Heal",
  category: "heal",
  useCase: "test heal",
  healAmount,
});

const shield = (shieldAmount: number, durationTurns: number): Ability => ({
  id: "ability-shield",
  name: "Shield",
  category: "shield",
  useCase: "test shield",
  shieldAmount,
  durationTurns,
});

const stun = (durationTurns: number): Ability => ({
  id: "ability-stun",
  name: "Stun",
  category: "stun",
  useCase: "test stun",
  durationTurns,
});

describe("computeCooldownTurns", () => {
  it("scales cooldown up with power and floors at 1 turn", () => {
    expect(computeCooldownTurns(8)).toBe(1);
    expect(computeCooldownTurns(20)).toBe(2);
    expect(computeCooldownTurns(35)).toBe(4);
  });
});

describe("abilityPower", () => {
  it("reduces each category to a single intensity number", () => {
    expect(abilityPower(strike(20))).toBe(20);
    expect(abilityPower(poison(4, 5, 3))).toBe(19);
    expect(abilityPower(heal(18))).toBe(18);
    expect(abilityPower(shield(20, 3))).toBe(20);
    expect(abilityPower(buff(1.5, 2))).toBe(50);
    expect(abilityPower(debuff(0.5, 2))).toBe(50);
    expect(abilityPower(stun(1))).toBe(30);
  });
});

describe("battleEngine — strike basics", () => {
  it("creates a battle with full health for both sides and player active", () => {
    const player = makeCharacter("player-1", "Player", strike(20));
    const opponent = makeCharacter("cpu-1", "CPU", strike(15));
    const state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    expect(state.status).toBe("in_progress");
    expect(state.activeSlot).toBe("player");
    expect(state.participants.player.currentHealth).toBe(100);
    expect(state.participants.opponent.currentHealth).toBe(100);
  });

  it("applies damage on a valid action and flips the turn", () => {
    const player = makeCharacter("player-1", "Player", strike(20));
    const opponent = makeCharacter("cpu-1", "CPU", strike(15));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    const state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    const { state: next, events } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    );

    expect(next.participants.opponent.currentHealth).toBe(80);
    expect(next.activeSlot).toBe("opponent");
    expect(events.some((e) => e.type === "DAMAGE_DEALT")).toBe(true);
  });

  it("rejects an action from a slot whose turn it isn't", () => {
    const player = makeCharacter("player-1", "Player", strike(20));
    const opponent = makeCharacter("cpu-1", "CPU", strike(15));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    const state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    const { state: next, events } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    );

    expect(next).toBe(state);
    expect(events[0].type).toBe("INVALID_ACTION");
  });

  it("enforces item cooldown scaled from damage dealt", () => {
    const player = makeCharacter("player-1", "Player", strike(20));
    const opponent = makeCharacter("cpu-1", "CPU", strike(15));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    ));
    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    ));

    const { events } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    );

    expect(events[0].type).toBe("ITEM_ON_COOLDOWN");
  });

  it("ends the battle and blocks further actions on knockout", () => {
    const player = makeCharacter("player-1", "Player", strike(200));
    const opponent = makeCharacter("cpu-1", "CPU", strike(15));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    const result = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    );
    state = result.state;

    expect(state.status).toBe("won");
    expect(result.events.some((e) => e.type === "BATTLE_ENDED")).toBe(true);

    const after = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    );
    expect(after.events[0].type).toBe("INVALID_ACTION");
  });
});

describe("battleEngine — poison", () => {
  it("deals an initial hit, attaches poison, and ticks damage on the target's next turn", () => {
    const player = makeCharacter("player-1", "Player", poison(4, 5, 3));
    const opponent = makeCharacter("cpu-1", "CPU", strike(1));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    ));
    expect(state.participants.opponent.currentHealth).toBe(96);
    expect(state.participants.opponent.statusEffects).toEqual([
      { kind: "poison", remainingTurns: 3, magnitude: 5 },
    ]);

    const tickResult = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    );
    state = tickResult.state;

    expect(tickResult.events.some((e) => e.type === "POISON_TICK")).toBe(true);
    // 96 (after initial hit) - 5 (poison tick on opponent's own turn); the
    // strike they use targets the player, not themselves.
    expect(state.participants.opponent.currentHealth).toBe(91);
    expect(
      state.participants.opponent.statusEffects.find((e) => e.kind === "poison")?.remainingTurns,
    ).toBe(2);
  });

  it("can end the battle if poison damage brings the ticking participant to 0", () => {
    const player = makeCharacter("player-1", "Player", poison(0, 50, 2));
    const opponent = makeCharacter("cpu-1", "CPU", strike(1));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });
    state = {
      ...state,
      participants: {
        ...state.participants,
        opponent: { ...state.participants.opponent, currentHealth: 30 },
      },
    };

    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    ));

    const result = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    );

    expect(result.state.status).toBe("won");
    expect(result.events.some((e) => e.type === "BATTLE_ENDED")).toBe(true);
  });
});

describe("battleEngine — buff and debuff", () => {
  it("boosts the buffed actor's own subsequent strike damage", () => {
    const player = makeCharacterWithItems("player-1", "Player", [buff(1.5, 2), strike(20)]);
    const opponent = makeCharacter("cpu-1", "CPU", strike(1));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1", "player-1-item-2"],
      opponent: ["cpu-1-item-1"],
    });

    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    ));
    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    ));

    const { state: afterStrike } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-2" },
      context,
    );

    expect(afterStrike.participants.opponent.currentHealth).toBe(100 - 30);
  });

  it("shrinks the debuffed actor's own subsequent strike damage", () => {
    const player = makeCharacter("player-1", "Player", debuff(0.5, 2));
    const opponent = makeCharacter("cpu-1", "CPU", strike(20));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    ));

    const { state: afterOpponentStrike } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    );

    expect(afterOpponentStrike.participants.player.currentHealth).toBe(100 - 10);
  });
});

describe("battleEngine — heal", () => {
  it("restores the actor's own health, clamped to max", () => {
    const player = makeCharacter("player-1", "Player", heal(30));
    const opponent = makeCharacter("cpu-1", "CPU", strike(1));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });
    state = {
      ...state,
      participants: {
        ...state.participants,
        player: { ...state.participants.player, currentHealth: 85 },
      },
    };

    const { state: healed, events } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    );

    expect(healed.participants.player.currentHealth).toBe(100);
    expect(events.some((e) => e.type === "HEAL_APPLIED")).toBe(true);
  });
});

describe("battleEngine — shield", () => {
  it("absorbs incoming damage up to its amount before health loss", () => {
    const player = makeCharacter("player-1", "Player", strike(1));
    const opponent = makeCharacterWithItems("cpu-1", "CPU", [shield(15, 3), strike(1)]);
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1", "cpu-1-item-2"],
    });

    ({ state } = applyAction(state, { type: "SKIP_TURN", actorSlot: "player" }, context));
    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    ));

    const beforeStrike = state.participants.opponent.currentHealth;
    const { state: afterStrike, events } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    );

    expect(afterStrike.participants.opponent.currentHealth).toBe(beforeStrike);
    expect(events.some((e) => e.type === "SHIELD_ABSORBED")).toBe(true);
    const remainingShield = afterStrike.participants.opponent.statusEffects.find(
      (e) => e.kind === "shield",
    );
    expect(remainingShield?.magnitude).toBe(14);
  });
});

describe("battleEngine — stun and skip turn", () => {
  it("blocks USE_ITEM while stunned but allows SKIP_TURN, which then frees the next turn", () => {
    const player = makeCharacter("player-1", "Player", stun(1));
    const opponent = makeCharacter("cpu-1", "CPU", strike(10));
    const context = { playerCharacter: player, opponentCharacter: opponent };
    let state = createBattle("battle-1", player, opponent, {
      player: ["player-1-item-1"],
      opponent: ["cpu-1-item-1"],
    });

    ({ state } = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "player", itemId: "player-1-item-1" },
      context,
    ));
    expect(state.participants.opponent.statusEffects.some((e) => e.kind === "stun")).toBe(true);

    const blocked = applyAction(
      state,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: "cpu-1-item-1" },
      context,
    );
    expect(blocked.events[0].type).toBe("INVALID_ACTION");
    expect(blocked.state).toBe(state);

    const skipped = applyAction(state, { type: "SKIP_TURN", actorSlot: "opponent" }, context);
    expect(skipped.events.some((e) => e.type === "TURN_SKIPPED")).toBe(true);
    expect(skipped.state.participants.opponent.statusEffects).toHaveLength(0);
    expect(skipped.state.activeSlot).toBe("player");
  });
});
