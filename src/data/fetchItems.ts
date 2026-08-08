import { Character } from "@/engine/types";
import { getGenerationApiUrl, isMockDataMode } from "@/lib/env";

export async function fetchCharacter(characterId: string): Promise<Character> {
  if (isMockDataMode()) {
    const res = await fetch(`/api/items?characterId=${characterId}`);
    if (!res.ok) {
      throw new Error(`Failed to fetch mock character: ${res.status}`);
    }
    return res.json();
  }

  const baseUrl = getGenerationApiUrl();
  const res = await fetch(`${baseUrl}/items?characterId=${characterId}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch character from generation API: ${res.status}`);
  }
  return res.json();
}
