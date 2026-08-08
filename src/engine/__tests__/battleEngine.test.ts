import { describe, expect, it } from "vitest";
import { applyAction, createBattle } from "../battleEngine";
import { computeCooldownTurns } from "../rules";
import { Character } from "../types";

function makeCharacter(
  id: string,
  displayName: string,
  damage: number,
): Character {
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
          ability: {
            id: `${id}-ability-1`,
            name: "Test Ability",
            damage,
            useCase: "test strike",
          },
        },
      ],
    },
  };
}

describe("computeCooldownTurns", () => {
  it("scales cooldown up with damage and floors at 1 turn", () => {
    expect(computeCooldownTurns(8)).toBe(1);
    expect(computeCooldownTurns(20)).toBe(2);
    expect(computeCooldownTurns(35)).toBe(4);
  });
});

describe("battleEngine", () => {
  it("creates a battle with full health for both sides and player active", () => {
    const player = makeCharacter("player-1", "Player", 20);
    const opponent = makeCharacter("cpu-1", "CPU", 15);
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
    const player = makeCharacter("player-1", "Player", 20);
    const opponent = makeCharacter("cpu-1", "CPU", 15);
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
    const player = makeCharacter("player-1", "Player", 20);
    const opponent = makeCharacter("cpu-1", "CPU", 15);
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
    const player = makeCharacter("player-1", "Player", 20);
    const opponent = makeCharacter("cpu-1", "CPU", 15);
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
    const player = makeCharacter("player-1", "Player", 200);
    const opponent = makeCharacter("cpu-1", "CPU", 15);
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
