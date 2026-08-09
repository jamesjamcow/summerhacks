export const ARENA_PLAYER_HEIGHT = 1.65;
export const ARENA_PLAYER_RADIUS = 0.36;
export const ARENA_MOVE_SPEED = 6.2;
export const ARENA_PROJECTILE_SPEED = 18;
export const ARENA_ROUNDS_TO_WIN = 3;

export type ArenaBlock = {
  x: number;
  y: number;
  z: number;
  width: number;
  height: number;
  depth: number;
  color: string;
};

export const ARENA_BLOCKS: ArenaBlock[] = [
  { x: 0, y: 2, z: -15, width: 32, height: 4, depth: 1.4, color: "#54585b" },
  { x: -16, y: 2, z: 0, width: 1.4, height: 4, depth: 31, color: "#5b5f61" },
  { x: 16, y: 2, z: 0, width: 1.4, height: 4, depth: 31, color: "#5b5f61" },
  { x: 0, y: 2, z: 15, width: 32, height: 4, depth: 1.4, color: "#54585b" },
  { x: -6.5, y: 1.5, z: 2, width: 6, height: 3, depth: 3, color: "#a75842" },
  { x: 7, y: 1.25, z: -3, width: 5, height: 2.5, depth: 5, color: "#455e65" },
  { x: 0, y: 0.55, z: -7, width: 7, height: 1.1, depth: 3, color: "#8f7964" },
  { x: 2, y: 1.2, z: 6, width: 2.5, height: 2.4, depth: 7, color: "#a36c4b" },
  { x: -10, y: 2.2, z: -8, width: 3.5, height: 4.4, depth: 3.5, color: "#536974" },
  ...Array.from({ length: 5 }, (_, index) => ({
    x: -4 + index * 1.75,
    y: 0.22 + index * 0.32,
    z: -10,
    width: 1.9,
    height: 0.45 + index * 0.65,
    depth: 3.4,
    color: "#77736c",
  })),
];

export const ARENA_SPAWNS = [
  { x: -11, z: 10, yaw: -Math.PI / 2 },
  { x: 11, z: 10, yaw: Math.PI / 2 },
] as const;

export function isArenaPositionBlocked(x: number, z: number) {
  if (
    x - ARENA_PLAYER_RADIUS < -15.2 ||
    x + ARENA_PLAYER_RADIUS > 15.2 ||
    z - ARENA_PLAYER_RADIUS < -14.2 ||
    z + ARENA_PLAYER_RADIUS > 14.2
  ) {
    return true;
  }

  return ARENA_BLOCKS.some((block) =>
    block.y + block.height / 2 > 0.1 &&
    x + ARENA_PLAYER_RADIUS > block.x - block.width / 2 &&
    x - ARENA_PLAYER_RADIUS < block.x + block.width / 2 &&
    z + ARENA_PLAYER_RADIUS > block.z - block.depth / 2 &&
    z - ARENA_PLAYER_RADIUS < block.z + block.depth / 2
  );
}

export function isArenaProjectileBlocked(x: number, y: number, z: number) {
  if (y <= 0 || x < -15.3 || x > 15.3 || z < -14.3 || z > 14.3) return true;

  return ARENA_BLOCKS.some((block) =>
    x >= block.x - block.width / 2 &&
    x <= block.x + block.width / 2 &&
    y >= block.y - block.height / 2 &&
    y <= block.y + block.height / 2 &&
    z >= block.z - block.depth / 2 &&
    z <= block.z + block.depth / 2
  );
}
