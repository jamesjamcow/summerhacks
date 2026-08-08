import { applyAction, ApplyActionContext, createBattle } from "./battleEngine";
import { BattleAction, BattleEvent, BattleState, Character } from "./types";

export function startBattle(
  battleId: string,
  playerCharacter: Character,
  opponentCharacter: Character,
  selectedItems: { player: string[]; opponent: string[] },
): Promise<BattleState> {
  return Promise.resolve(
    createBattle(battleId, playerCharacter, opponentCharacter, selectedItems),
  );
}

export function submitAction(
  state: BattleState,
  action: BattleAction,
  context: ApplyActionContext,
): Promise<{ state: BattleState; events: BattleEvent[] }> {
  return Promise.resolve(applyAction(state, action, context));
}
