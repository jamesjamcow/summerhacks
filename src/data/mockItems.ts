import { Item } from "@/engine/types";

export const mockItems: Item[] = [
  {
    id: "item-guitar",
    name: "Beat-Up Guitar",
    spriteKey: "item_guitar",
    ability: {
      id: "ability-guitar-riff",
      name: "Power Chord",
      category: "buff",
      damageMultiplier: 1.5,
      durationTurns: 2,
      useCase: "A hype riff that pumps you up for a couple turns.",
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
      category: "strike",
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
      category: "stun",
      durationTurns: 1,
      useCase: "A blinding flash from an old camera that stuns them cold.",
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
      category: "strike",
      damage: 22,
      useCase: "Full-speed board check.",
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
      category: "poison",
      damage: 4,
      poisonDamagePerTurn: 5,
      durationTurns: 3,
      useCase: "A splash of scalding coffee that keeps burning.",
    },
    sourceMemory: { friendName: "Riley" },
  },
  {
    id: "item-hoodie",
    name: "Old Hoodie",
    spriteKey: "item_hoodie",
    ability: {
      id: "ability-hoodie-wrap",
      name: "Cozy Wrap",
      category: "shield",
      shieldAmount: 20,
      durationTurns: 3,
      useCase: "Wrap yourself in a worn, comforting hoodie.",
    },
    sourceMemory: { friendName: "Jess" },
  },
  {
    id: "item-card",
    name: "Get-Well Card",
    spriteKey: "item_card",
    ability: {
      id: "ability-card-cheer",
      name: "Handwritten Note",
      category: "heal",
      healAmount: 18,
      useCase: "Reading a kind note from a friend lifts your spirits.",
    },
    sourceMemory: { friendName: "Riley" },
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
      category: "strike",
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
      name: "Embarrassing Page",
      category: "debuff",
      damageMultiplier: 0.5,
      durationTurns: 2,
      useCase: "Flips to an embarrassing photo that rattles their confidence.",
    },
  },
];
