import { NextRequest, NextResponse } from "next/server";
import { createBattle } from "@/engine/battleEngine";
import { mockCpuCharacter, mockPlayerCharacter } from "@/data/mockCharacters";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const selectedItems: { player: string[]; opponent: string[] } = {
    player: body.selectedItemIds ?? [],
    opponent: mockCpuCharacter.inventory.items.map((item) => item.id),
  };

  const battleId = body.battleId ?? crypto.randomUUID();
  const state = createBattle(
    battleId,
    mockPlayerCharacter,
    mockCpuCharacter,
    selectedItems,
  );

  return NextResponse.json({ state });
}
