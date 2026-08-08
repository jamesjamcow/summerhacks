import { Character } from "@/engine/types";
import { mockCpuLoadout, mockItems } from "./mockItems";

export const mockPlayerCharacter: Character = {
  id: "char-player-1",
  displayName: "You",
  maxHealth: 100,
  inventory: {
    characterId: "char-player-1",
    items: mockItems,
  },
};

export const mockCpuCharacter: Character = {
  id: "char-cpu-1",
  displayName: "Memory Echo",
  maxHealth: 100,
  inventory: {
    characterId: "char-cpu-1",
    items: mockCpuLoadout,
  },
};
