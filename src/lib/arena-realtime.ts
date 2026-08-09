import { schema, type SchemaType } from "@colyseus/schema";

import type { ArenaMapSpec } from "@/lib/arena-world";

export const ArenaItemState = schema({
  id: "string",
  name: "string",
  memoryLabel: "string",
  imageUrl: "string",
  modelUrl: "string",
  originalImageUrl: "string",
});
export type ArenaItemState = SchemaType<typeof ArenaItemState>;

export const ArenaPlayerState = schema({
  userId: "string",
  name: "string",
  avatarImageUrl: "string",
  avatarModelUrl: "string",
  x: "float32",
  y: "float32",
  z: "float32",
  yaw: "float32",
  pitch: "float32",
  health: "uint8",
  score: "uint8",
  connected: "boolean",
  inventoryIndex: "uint8",
  inventorySize: "uint8",
  item: ArenaItemState,
});
export type ArenaPlayerState = SchemaType<typeof ArenaPlayerState>;

export const ArenaProjectileState = schema({
  id: "string",
  ownerId: "string",
  x: "float32",
  y: "float32",
  z: "float32",
  vx: "float32",
  vy: "float32",
  vz: "float32",
  item: ArenaItemState,
});
export type ArenaProjectileState = SchemaType<typeof ArenaProjectileState>;

export const ArenaMapBlockState = schema({
  x: "float32",
  y: "float32",
  z: "float32",
  width: "float32",
  height: "float32",
  depth: "float32",
  color: "string",
  style: "string",
});
export type ArenaMapBlockState = SchemaType<typeof ArenaMapBlockState>;

export const ArenaMapDecorationState = schema({
  kind: "string",
  x: "float32",
  z: "float32",
  rotation: "float32",
  scale: "float32",
  color: "string",
});
export type ArenaMapDecorationState = SchemaType<typeof ArenaMapDecorationState>;

export const ArenaMapLandmarkState = schema({
  id: "string",
  name: "string",
  imageUrl: "string",
  modelUrl: "string",
  x: "float32",
  z: "float32",
  rotation: "float32",
  scale: "float32",
});
export type ArenaMapLandmarkState = SchemaType<typeof ArenaMapLandmarkState>;

export const ArenaMapState = schema({
  version: "uint8",
  themeName: "string",
  biome: "string",
  allPhotosOutdoor: "boolean",
  source: "string",
  photoCount: "uint8",
  groundColor: "string",
  skyColor: "string",
  fogColor: "string",
  pathColor: "string",
  accentColor: "string",
  blocks: [ArenaMapBlockState],
  decorations: [ArenaMapDecorationState],
  landmarks: [ArenaMapLandmarkState],
});
export type ArenaMapState = SchemaType<typeof ArenaMapState>;

export function createArenaMapState(map: ArenaMapSpec) {
  const state = new ArenaMapState({
    accentColor: map.accentColor,
    allPhotosOutdoor: map.allPhotosOutdoor,
    biome: map.biome,
    fogColor: map.fogColor,
    groundColor: map.groundColor,
    pathColor: map.pathColor,
    photoCount: map.photoCount,
    skyColor: map.skyColor,
    source: map.source,
    themeName: map.themeName,
    version: map.version,
  });
  state.blocks.push(...map.blocks.map((block) => new ArenaMapBlockState(block)));
  state.decorations.push(...map.decorations.map((decoration) => new ArenaMapDecorationState({
    color: decoration.color || "",
    kind: decoration.kind,
    rotation: decoration.rotation || 0,
    scale: decoration.scale || 1,
    x: decoration.x,
    z: decoration.z,
  })));
  state.landmarks.push(...map.landmarks.map((landmark) => new ArenaMapLandmarkState({
    id: landmark.id,
    imageUrl: landmark.imageUrl || "",
    modelUrl: landmark.modelUrl || "",
    name: landmark.name,
    rotation: landmark.rotation,
    scale: landmark.scale,
    x: landmark.x,
    z: landmark.z,
  })));
  return state;
}

export const ArenaState = schema({
  roomCode: "string",
  matchId: "string",
  phase: "string",
  round: "uint8",
  phaseEndsAt: "float64",
  winnerId: "string",
  eliminatedPlayerId: "string",
  resultReason: "string",
  resultReceipt: "string",
  impactItem: ArenaItemState,
  map: ArenaMapState,
  players: { map: ArenaPlayerState, default: new Map() },
  projectiles: { map: ArenaProjectileState, default: new Map() },
});
export type ArenaState = SchemaType<typeof ArenaState>;

export type ArenaRealtimePhase =
  | "waiting"
  | "generating-map"
  | "countdown"
  | "playing"
  | "round-over"
  | "match-end";

export type ArenaPlayerSnapshot = {
  userId: string;
  name: string;
  avatarImageUrl: string;
  avatarModelUrl: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  health: number;
  score: number;
  connected: boolean;
  inventoryIndex: number;
  inventorySize: number;
  item: {
    id: string;
    name: string;
    memoryLabel: string;
    imageUrl: string;
    modelUrl: string;
    originalImageUrl: string;
  };
};

export type ArenaProjectileSnapshot = {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  item: ArenaPlayerSnapshot["item"];
};

export type ArenaRealtimeSnapshot = {
  roomCode: string;
  matchId: string;
  phase: ArenaRealtimePhase;
  round: number;
  phaseEndsAt: number;
  winnerId: string;
  eliminatedPlayerId: string;
  resultReason: "score" | "forfeit" | "";
  resultReceipt: string;
  impactItem: ArenaPlayerSnapshot["item"];
  map: ArenaMapSpec;
  players: Record<string, ArenaPlayerSnapshot>;
  projectiles: Record<string, ArenaProjectileSnapshot>;
};

export function snapshotArenaState(state: ArenaState): ArenaRealtimeSnapshot {
  const itemSnapshot = (item: ArenaItemState): ArenaPlayerSnapshot["item"] => ({
    id: item.id,
    name: item.name,
    memoryLabel: item.memoryLabel,
    imageUrl: item.imageUrl,
    modelUrl: item.modelUrl,
    originalImageUrl: item.originalImageUrl,
  });

  const mapSnapshot: ArenaMapSpec = {
    accentColor: state.map.accentColor,
    allPhotosOutdoor: state.map.allPhotosOutdoor,
    biome: state.map.biome as ArenaMapSpec["biome"],
    blocks: Array.from(state.map.blocks).map((block) => ({
      color: block.color,
      depth: block.depth,
      height: block.height,
      style: block.style as ArenaMapSpec["blocks"][number]["style"],
      width: block.width,
      x: block.x,
      y: block.y,
      z: block.z,
    })),
    decorations: Array.from(state.map.decorations).map((decoration) => ({
      ...(decoration.color ? { color: decoration.color } : {}),
      kind: decoration.kind as ArenaMapSpec["decorations"][number]["kind"],
      rotation: decoration.rotation,
      scale: decoration.scale,
      x: decoration.x,
      z: decoration.z,
    })),
    fogColor: state.map.fogColor,
    groundColor: state.map.groundColor,
    landmarks: Array.from(state.map.landmarks).map((landmark) => ({
      id: landmark.id,
      ...(landmark.imageUrl ? { imageUrl: landmark.imageUrl } : {}),
      ...(landmark.modelUrl ? { modelUrl: landmark.modelUrl } : {}),
      name: landmark.name,
      rotation: landmark.rotation,
      scale: landmark.scale,
      x: landmark.x,
      z: landmark.z,
    })),
    pathColor: state.map.pathColor,
    photoCount: state.map.photoCount,
    skyColor: state.map.skyColor,
    source: state.map.source as ArenaMapSpec["source"],
    themeName: state.map.themeName,
    version: 1,
  };

  return {
    roomCode: state.roomCode,
    matchId: state.matchId,
    phase: state.phase as ArenaRealtimePhase,
    round: state.round,
    phaseEndsAt: state.phaseEndsAt,
    winnerId: state.winnerId,
    eliminatedPlayerId: state.eliminatedPlayerId,
    resultReason: state.resultReason as ArenaRealtimeSnapshot["resultReason"],
    resultReceipt: state.resultReceipt,
    impactItem: itemSnapshot(state.impactItem),
    map: mapSnapshot,
    players: Object.fromEntries(Array.from(state.players.entries()).map(([id, player]) => [
      id,
      {
        userId: player.userId,
        name: player.name,
        avatarImageUrl: player.avatarImageUrl,
        avatarModelUrl: player.avatarModelUrl,
        x: player.x,
        y: player.y,
        z: player.z,
        yaw: player.yaw,
        pitch: player.pitch,
        health: player.health,
        score: player.score,
        connected: player.connected,
        inventoryIndex: player.inventoryIndex,
        inventorySize: player.inventorySize,
        item: itemSnapshot(player.item),
      },
    ])),
    projectiles: Object.fromEntries(Array.from(state.projectiles.entries()).map(([id, projectile]) => [
      id,
      {
        id: projectile.id,
        ownerId: projectile.ownerId,
        x: projectile.x,
        y: projectile.y,
        z: projectile.z,
        vx: projectile.vx,
        vy: projectile.vy,
        vz: projectile.vz,
        item: itemSnapshot(projectile.item),
      },
    ])),
  };
}
