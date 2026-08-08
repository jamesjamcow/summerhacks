import { NextRequest, NextResponse } from "next/server";
import { applyAction } from "@/engine/battleEngine";
import { mockCpuCharacter, mockPlayerCharacter } from "@/data/mockCharacters";
import { BattleAction, BattleState } from "@/engine/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const state: BattleState = body.state;
  const action: BattleAction = body.action;

  const result = applyAction(state, action, {
    playerCharacter: mockPlayerCharacter,
    opponentCharacter: mockCpuCharacter,
  });

  return NextResponse.json(result);
}
