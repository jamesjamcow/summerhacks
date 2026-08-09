import { schema, type SchemaType } from "@colyseus/schema";

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
  avatarUrl: "string",
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

export const ArenaState = schema({
  roomCode: "string",
  phase: "string",
  round: "uint8",
  phaseEndsAt: "float64",
  winnerId: "string",
  eliminatedPlayerId: "string",
  resultReason: "string",
  impactItem: ArenaItemState,
  players: { map: ArenaPlayerState, default: new Map() },
  projectiles: { map: ArenaProjectileState, default: new Map() },
});
export type ArenaState = SchemaType<typeof ArenaState>;

export type ArenaRealtimePhase =
  | "waiting"
  | "countdown"
  | "playing"
  | "round-over"
  | "match-end";

export type ArenaPlayerSnapshot = {
  userId: string;
  name: string;
  avatarUrl: string;
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
  phase: ArenaRealtimePhase;
  round: number;
  phaseEndsAt: number;
  winnerId: string;
  eliminatedPlayerId: string;
  resultReason: "score" | "forfeit" | "";
  impactItem: ArenaPlayerSnapshot["item"];
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

  return {
    roomCode: state.roomCode,
    phase: state.phase as ArenaRealtimePhase,
    round: state.round,
    phaseEndsAt: state.phaseEndsAt,
    winnerId: state.winnerId,
    eliminatedPlayerId: state.eliminatedPlayerId,
    resultReason: state.resultReason as ArenaRealtimeSnapshot["resultReason"],
    impactItem: itemSnapshot(state.impactItem),
    players: Object.fromEntries(Array.from(state.players.entries()).map(([id, player]) => [
      id,
      {
        userId: player.userId,
        name: player.name,
        avatarUrl: player.avatarUrl,
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
