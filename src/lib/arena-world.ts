export const ARENA_PLAYER_HEIGHT = 1.65;
export const ARENA_PLAYER_RADIUS = 0.36;
export const ARENA_MOVE_SPEED = 6.2;
export const ARENA_JUMP_SPEED = 8.2;
export const ARENA_GRAVITY = 22;
export const ARENA_PROJECTILE_SPEED = 18;
export const ARENA_ROUNDS_TO_WIN = 3;

export const ARENA_HALF_WIDTH = 26;
export const ARENA_HALF_DEPTH = 22;
export const ARENA_GROUND_WIDTH = 64;
export const ARENA_GROUND_DEPTH = 56;

export type ArenaBlockStyle =
  | "wall"
  | "stone"
  | "timber"
  | "planter"
  | "platform"
  | "steps";

export type ArenaBlock = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
  style: ArenaBlockStyle;
};

export type ArenaDecoration = {
  kind: "tree" | "lamp" | "flag" | "rock" | "grass";
  x: number;
  z: number;
  rotation?: number;
  scale?: number;
  color?: string;
};

export const ARENA_BIOMES = [
  "grass-field",
  "forest",
  "beach",
  "snowfield",
  "desert",
  "city-park",
  "indoor-hall",
  "mixed-memory",
] as const;

export type ArenaBiome = (typeof ARENA_BIOMES)[number];
export type ArenaMapSource = "generating" | "gemini" | "fallback";

export type ArenaMapLandmark = {
  id: string;
  imageUrl?: string;
  modelUrl?: string;
  name: string;
  rotation: number;
  scale: number;
  x: number;
  z: number;
};

export type ArenaMapSpec = {
  accentColor: string;
  allPhotosOutdoor: boolean;
  biome: ArenaBiome;
  blocks: ArenaBlock[];
  decorations: ArenaDecoration[];
  fogColor: string;
  groundColor: string;
  landmarks: ArenaMapLandmark[];
  pathColor: string;
  photoCount: number;
  skyColor: string;
  source: ArenaMapSource;
  themeName: string;
  version: 1;
};

export type ArenaMapTheme = Pick<
  ArenaMapSpec,
  | "accentColor"
  | "allPhotosOutdoor"
  | "biome"
  | "fogColor"
  | "groundColor"
  | "pathColor"
  | "skyColor"
  | "themeName"
> & {
  planterColor: string;
  stoneColor: string;
  timberColor: string;
  wallColor: string;
};

const mirroredBlocks = (
  blocks: Omit<ArenaBlock, "x">[],
  x: number,
): ArenaBlock[] => blocks.flatMap((block) => [
  { ...block, x },
  { ...block, x: -x, z: -block.z },
]);

/**
 * The server and renderer both consume this geometry. Keep gameplay cover here
 * instead of adding client-only obstacles that players could walk through.
 */
export const ARENA_BLOCKS: ArenaBlock[] = [
  { x: 0, y: 2.6, z: -ARENA_HALF_DEPTH, width: 53.5, height: 5.2, depth: 1.5, color: "#59635f", style: "wall" },
  { x: 0, y: 2.6, z: ARENA_HALF_DEPTH, width: 53.5, height: 5.2, depth: 1.5, color: "#59635f", style: "wall" },
  { x: -ARENA_HALF_WIDTH, y: 2.6, z: 0, width: 1.5, height: 5.2, depth: 45.5, color: "#626963", style: "wall" },
  { x: ARENA_HALF_WIDTH, y: 2.6, z: 0, width: 1.5, height: 5.2, depth: 45.5, color: "#626963", style: "wall" },

  // Central memory monument and its jumpable plinth.
  { x: 0, y: 0.45, z: 0, width: 7, height: 0.9, depth: 7, color: "#c09562", style: "platform" },
  { x: 0, y: 2.05, z: 0, width: 2.3, height: 3.2, depth: 2.3, color: "#6b7f7a", style: "stone" },

  // Mirrored pavilions and low cover keep both spawn lanes fair.
  ...mirroredBlocks([
    { y: 1.35, z: -6.5, width: 7.2, height: 2.7, depth: 3.2, color: "#a85f49", style: "timber" },
    { y: 0.55, z: 7.5, width: 6.2, height: 1.1, depth: 2.6, color: "#708268", style: "planter" },
    { y: 1.7, z: -15.2, width: 3.8, height: 3.4, depth: 3.8, color: "#536d76", style: "stone" },
    { y: 0.65, z: 14.4, width: 3.2, height: 1.3, depth: 3.2, color: "#9a704d", style: "timber" },
  ], 11.5),

  // Cross-map cover and small climbable/jumpable pieces.
  { x: 0, y: 0.5, z: -11.5, width: 9.5, height: 1, depth: 2.3, color: "#77866e", style: "planter" },
  { x: 0, y: 0.5, z: 11.5, width: 9.5, height: 1, depth: 2.3, color: "#77866e", style: "planter" },
  { x: -19.5, y: 0.45, z: 2, width: 3.1, height: 0.9, depth: 5.2, color: "#94704e", style: "steps" },
  { x: 19.5, y: 0.45, z: -2, width: 3.1, height: 0.9, depth: 5.2, color: "#94704e", style: "steps" },
  { x: -18.5, y: 1.05, z: -9, width: 2.6, height: 2.1, depth: 2.6, color: "#a65e45", style: "timber" },
  { x: 18.5, y: 1.05, z: 9, width: 2.6, height: 2.1, depth: 2.6, color: "#a65e45", style: "timber" },
  { x: -5.2, y: 0.38, z: 17.2, width: 4.8, height: 0.76, depth: 2.1, color: "#8d765d", style: "steps" },
  { x: 5.2, y: 0.38, z: -17.2, width: 4.8, height: 0.76, depth: 2.1, color: "#8d765d", style: "steps" },
];

export const ARENA_DECORATIONS: ArenaDecoration[] = [
  // Trees sit beyond the collision walls and turn the arena into a garden ruin.
  ...[-23, -15, -7, 7, 15, 23].flatMap((x, index) => [
    { kind: "tree" as const, x, z: -25.5, scale: 0.8 + (index % 3) * 0.12 },
    { kind: "tree" as const, x: -x, z: 25.5, scale: 0.84 + ((index + 1) % 3) * 0.1 },
  ]),
  { kind: "tree", x: -29.5, z: -15, scale: 1.2 },
  { kind: "tree", x: -29, z: 13, scale: 1.05 },
  { kind: "tree", x: 29.5, z: -13, scale: 1.1 },
  { kind: "tree", x: 29, z: 15, scale: 1.2 },

  { kind: "lamp", x: -21.5, z: -17.5 },
  { kind: "lamp", x: 21.5, z: 17.5 },
  { kind: "lamp", x: -21.5, z: 17.5 },
  { kind: "lamp", x: 21.5, z: -17.5 },
  { kind: "lamp", x: -7, z: 3.8, scale: 0.9 },
  { kind: "lamp", x: 7, z: -3.8, scale: 0.9 },

  { kind: "flag", x: -24.9, z: -4.8, rotation: Math.PI / 2, color: "#ef6657" },
  { kind: "flag", x: 24.9, z: 4.8, rotation: -Math.PI / 2, color: "#4bc6c9" },
  { kind: "flag", x: -4.5, z: -21.2, color: "#f2c84b" },
  { kind: "flag", x: 4.5, z: 21.2, rotation: Math.PI, color: "#f2c84b" },

  ...[-20, -14, -7, 7, 14, 20].flatMap((x, index) => [
    { kind: "grass" as const, x, z: -19 + (index % 2) * 2, rotation: index * 0.7, scale: 0.8 },
    { kind: "grass" as const, x: -x, z: 19 - (index % 2) * 2, rotation: index * -0.5, scale: 0.9 },
  ]),
  { kind: "rock", x: -23.2, z: 8.5, rotation: 0.4, scale: 0.8 },
  { kind: "rock", x: 23, z: -8, rotation: -0.7, scale: 0.9 },
];

/**
 * Photo objects occupy fixed perimeter plinths. Gemini chooses their order,
 * while fixed safe positions and bounded scale preserve fair collision lanes.
 */
export const ARENA_LANDMARK_SLOTS = [
  { x: -20.5, z: -24.8, rotation: 0 },
  { x: -10.5, z: -24.8, rotation: 0 },
  { x: 0, z: -24.8, rotation: 0 },
  { x: 10.5, z: -24.8, rotation: 0 },
  { x: 20.5, z: -24.8, rotation: 0 },
  { x: -20.5, z: 24.8, rotation: Math.PI },
  { x: -10.5, z: 24.8, rotation: Math.PI },
  { x: 0, z: 24.8, rotation: Math.PI },
  { x: 10.5, z: 24.8, rotation: Math.PI },
  { x: 20.5, z: 24.8, rotation: Math.PI },
  { x: -29.2, z: 0, rotation: Math.PI / 2 },
  { x: 29.2, z: 0, rotation: -Math.PI / 2 },
] as const;

const FALLBACK_THEME: ArenaMapTheme = {
  accentColor: "#e8c75d",
  allPhotosOutdoor: false,
  biome: "city-park",
  fogColor: "#8bc9d1",
  groundColor: "#71806a",
  pathColor: "#b19a78",
  planterColor: "#77866e",
  skyColor: "#8bc9d1",
  stoneColor: "#617277",
  themeName: "Garden of Memories",
  timberColor: "#9a674c",
  wallColor: "#59635f",
};

export function createThemedArenaMap(
  theme: ArenaMapTheme,
  landmarks: ArenaMapLandmark[] = [],
  source: ArenaMapSource = "gemini",
): ArenaMapSpec {
  const biome = theme.allPhotosOutdoor ? "grass-field" : theme.biome;
  const groundColor = theme.allPhotosOutdoor ? "#69a85d" : theme.groundColor;
  const colorForStyle: Record<ArenaBlockStyle, string> = {
    wall: theme.wallColor,
    stone: theme.stoneColor,
    timber: theme.timberColor,
    planter: theme.planterColor,
    platform: theme.accentColor,
    steps: theme.stoneColor,
  };

  return {
    accentColor: theme.accentColor,
    allPhotosOutdoor: theme.allPhotosOutdoor,
    biome,
    blocks: ARENA_BLOCKS.map((block) => ({
      ...block,
      color: colorForStyle[block.style],
    })),
    decorations: ARENA_DECORATIONS
      .filter((decoration) => !(
        landmarks.length > 0 &&
        decoration.kind === "tree" &&
        Math.abs(decoration.z) > 24 &&
        Math.abs(decoration.x) < 25
      ))
      .map((decoration) => (
        decoration.kind === "flag"
          ? { ...decoration, color: theme.accentColor }
          : { ...decoration }
      )),
    fogColor: theme.fogColor,
    groundColor,
    landmarks: landmarks.slice(0, ARENA_LANDMARK_SLOTS.length),
    pathColor: theme.pathColor,
    photoCount: landmarks.length,
    skyColor: theme.skyColor,
    source,
    themeName: theme.themeName,
    version: 1,
  };
}

export const FALLBACK_ARENA_MAP = createThemedArenaMap(
  FALLBACK_THEME,
  [],
  "fallback",
);

export const ARENA_SPAWNS = [
  { x: -19, z: 16, yaw: -Math.PI / 2 },
  { x: 19, z: 16, yaw: Math.PI / 2 },
] as const;

function overlapsBlockFootprint(x: number, z: number, block: ArenaBlock, padding: number) {
  return x + padding > block.x - block.width / 2 &&
    x - padding < block.x + block.width / 2 &&
    z + padding > block.z - block.depth / 2 &&
    z - padding < block.z + block.depth / 2;
}

export function isArenaPositionBlocked(
  x: number,
  y: number,
  z: number,
  blocks: Iterable<ArenaBlock> = ARENA_BLOCKS,
) {
  if (
    x - ARENA_PLAYER_RADIUS < -ARENA_HALF_WIDTH + 0.8 ||
    x + ARENA_PLAYER_RADIUS > ARENA_HALF_WIDTH - 0.8 ||
    z - ARENA_PLAYER_RADIUS < -ARENA_HALF_DEPTH + 0.8 ||
    z + ARENA_PLAYER_RADIUS > ARENA_HALF_DEPTH - 0.8
  ) {
    return true;
  }

  return Array.from(blocks).some((block) => {
    const blockBottom = block.y - block.height / 2;
    const blockTop = block.y + block.height / 2;
    const overlapsVertically = y < blockTop - 0.05 &&
      y + ARENA_PLAYER_HEIGHT > blockBottom + 0.05;
    return overlapsVertically && overlapsBlockFootprint(x, z, block, ARENA_PLAYER_RADIUS);
  });
}

/** Returns the highest surface crossed by a falling player, including ground. */
export function getArenaLandingHeight(
  x: number,
  z: number,
  fromY: number,
  toY: number,
  blocks: Iterable<ArenaBlock> = ARENA_BLOCKS,
) {
  let landingHeight = fromY >= 0 && toY <= 0 ? 0 : -Infinity;
  Array.from(blocks).forEach((block) => {
    const blockTop = block.y + block.height / 2;
    if (
      blockTop <= fromY + 0.04 &&
      blockTop >= toY - 0.04 &&
      overlapsBlockFootprint(x, z, block, ARENA_PLAYER_RADIUS * 0.72)
    ) {
      landingHeight = Math.max(landingHeight, blockTop);
    }
  });
  return Number.isFinite(landingHeight) ? landingHeight : undefined;
}

export function isArenaProjectileBlocked(
  x: number,
  y: number,
  z: number,
  blocks: Iterable<ArenaBlock> = ARENA_BLOCKS,
) {
  if (
    y <= 0 ||
    x < -ARENA_HALF_WIDTH + 0.7 ||
    x > ARENA_HALF_WIDTH - 0.7 ||
    z < -ARENA_HALF_DEPTH + 0.7 ||
    z > ARENA_HALF_DEPTH - 0.7
  ) return true;

  return Array.from(blocks).some((block) =>
    x >= block.x - block.width / 2 &&
    x <= block.x + block.width / 2 &&
    y >= block.y - block.height / 2 &&
    y <= block.y + block.height / 2 &&
    z >= block.z - block.depth / 2 &&
    z <= block.z + block.depth / 2
  );
}
