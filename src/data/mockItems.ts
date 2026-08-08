import { Item } from "@/engine/types";

export const mockItems: Item[] = [
  {
    id: "item-guitar",
    name: "Beat-Up Guitar",
    spriteKey: "item_guitar",
    ability: {
      id: "ability-guitar-riff",
      name: "Power Chord",
      damage: 18,
      useCase: "A loud strum that stuns with nostalgia.",
    },
    sourceMemory: { friendName: "Sam" },
  },
  {
    id: "item-hat",
    name: "Faded Baseball Cap",
    spriteKey: "item_hat",
    ability: {
      id: "ability-hat-toss",
      name: "Cap Toss",
      damage: 10,
      useCase: "A quick flung frisbee-style hit.",
    },
    sourceMemory: { friendName: "Jess" },
  },
  {
    id: "item-polaroid",
    name: "Polaroid Camera",
    spriteKey: "item_polaroid",
    ability: {
      id: "ability-polaroid-flash",
      name: "Flashbang",
      damage: 14,
      useCase: "Blinding flash from an old camera.",
      cooldownTurns: 2,
    },
    sourceMemory: { friendName: "Alex" },
  },
  {
    id: "item-skateboard",
    name: "Cracked Skateboard",
    spriteKey: "item_skateboard",
    ability: {
      id: "ability-skateboard-grind",
      name: "Grind Slam",
      damage: 22,
      useCase: "Full-speed board check.",
      cooldownTurns: 3,
    },
    sourceMemory: { friendName: "Sam" },
  },
  {
    id: "item-mug",
    name: "Chipped Coffee Mug",
    spriteKey: "item_mug",
    ability: {
      id: "ability-mug-splash",
      name: "Hot Splash",
      damage: 8,
      useCase: "A splash of lukewarm coffee.",
    },
    sourceMemory: { friendName: "Riley" },
  },
  {
    id: "item-hoodie",
    name: "Old Hoodie",
    spriteKey: "item_hoodie",
    ability: {
      id: "ability-hoodie-whip",
      name: "Sleeve Whip",
      damage: 12,
      useCase: "A whip crack from a worn sleeve.",
    },
    sourceMemory: { friendName: "Jess" },
  },
];

export const mockCpuLoadout: Item[] = [
  {
    id: "item-cpu-trophy",
    name: "Dusty Trophy",
    spriteKey: "item_trophy",
    ability: {
      id: "ability-trophy-bonk",
      name: "Trophy Bonk",
      damage: 16,
      useCase: "A hefty overhead bonk.",
    },
  },
  {
    id: "item-cpu-yearbook",
    name: "Torn Yearbook",
    spriteKey: "item_yearbook",
    ability: {
      id: "ability-yearbook-slam",
      name: "Page Slam",
      damage: 12,
      useCase: "A slam of old memories.",
    },
  },
];
