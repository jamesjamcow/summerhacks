import { NextRequest, NextResponse } from "next/server";
import { mockCpuCharacter, mockPlayerCharacter } from "@/data/mockCharacters";
import { getGenerationApiUrl, isMockDataMode } from "@/lib/env";

export async function GET(request: NextRequest) {
  const characterId = request.nextUrl.searchParams.get("characterId");

  if (isMockDataMode()) {
    const character =
      characterId === mockCpuCharacter.id ? mockCpuCharacter : mockPlayerCharacter;
    return NextResponse.json(character);
  }

  const baseUrl = getGenerationApiUrl();
  if (!baseUrl) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_GENERATION_API_URL is not configured" },
      { status: 500 },
    );
  }

  const res = await fetch(`${baseUrl}/items?characterId=${characterId}`);
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
