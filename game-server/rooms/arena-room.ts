import { randomUUID } from "node:crypto";

import {
  Room,
  ServerError,
  type Client,
} from "colyseus";

import {
  ArenaItemState,
  ArenaPlayerState,
  ArenaProjectileState,
  ArenaState,
} from "../../src/lib/arena-realtime";
import {
  type ArenaTicketItem,
  type ArenaTicketPayload,
  verifyArenaTicket,
} from "../../src/lib/arena-ticket";
import {
  ARENA_MOVE_SPEED,
  ARENA_PLAYER_HEIGHT,
  ARENA_PLAYER_RADIUS,
  ARENA_PROJECTILE_SPEED,
  ARENA_ROUNDS_TO_WIN,
  ARENA_SPAWNS,
  isArenaPositionBlocked,
  isArenaProjectileBlocked,
} from "../../src/lib/arena-world";

type ArenaInput = {
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
};

type ArenaRoomClient = Client<{
  auth: ArenaTicketPayload;
  userData: { userId: string };
}>;

type ProjectileRuntime = {
  age: number;
  expiresAt: number;
};

const COUNTDOWN_MS = 3_000;
const ROUND_BREAK_MS = 3_000;
const SHOT_COOLDOWN_MS = 320;
const EMPTY_INPUT: ArenaInput = { forward: 0, strafe: 0, yaw: 0, pitch: 0 };

function finite(value: unknown) {
  return typeof value === "number" && Number.isFinite(value);
}

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function normalizedRoomCode(value: unknown) {
  return typeof value === "string"
    ? value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 8)
    : "";
}

function stateItem(item: ArenaTicketItem) {
  return new ArenaItemState({
    id: item.id,
    imageUrl: item.imageUrl || "",
    memoryLabel: item.memoryLabel,
    modelUrl: item.modelUrl || "",
    name: item.name,
  });
}

function emptyStateItem() {
  return new ArenaItemState({
    id: "",
    imageUrl: "",
    memoryLabel: "",
    modelUrl: "",
    name: "memory",
  });
}

export class ArenaRoom extends Room<{
  state: ArenaState;
  client: ArenaRoomClient;
  metadata: { roomCode: string };
}> {
  maxClients = 2;
  patchRate = 50;
  maxMessagesPerSecond = 35;

  state = new ArenaState({
    eliminatedPlayerId: "",
    phase: "waiting",
    phaseEndsAt: 0,
    resultReason: "",
    roomCode: "",
    round: 0,
    winnerId: "",
  });

  private readonly inputByUser = new Map<string, ArenaInput>();
  private readonly inventoryByUser = new Map<string, ArenaTicketItem[]>();
  private readonly lastShotAt = new Map<string, number>();
  private readonly projectileRuntime = new Map<string, ProjectileRuntime>();

  static async onAuth(token: string, options: unknown) {
    try {
      const ticket = verifyArenaTicket(token);
      const requestedRoomCode = normalizedRoomCode(
        options && typeof options === "object"
          ? (options as Record<string, unknown>).roomCode
          : "",
      );
      if (!requestedRoomCode || requestedRoomCode !== ticket.roomCode) {
        throw new Error("ROOM_CODE_MISMATCH");
      }
      return ticket;
    } catch {
      throw new ServerError(401, "Your arena session expired. Reopen the arena to try again.");
    }
  }

  onCreate(options: { roomCode?: unknown }) {
    const roomCode = normalizedRoomCode(options.roomCode);
    if (!roomCode) throw new ServerError(400, "A valid scrapbook room code is required.");

    this.state.roomCode = roomCode;
    this.metadata = { roomCode };
    this.setSimulationInterval((deltaTime) => this.updateWorld(deltaTime), 1000 / 30);
    this.onMessage("input", (client, message: unknown) => this.receiveInput(client, message));
    this.onMessage("shoot", (client) => this.shoot(client));
  }

  onJoin(client: ArenaRoomClient, _options: unknown, auth: ArenaTicketPayload) {
    const ticket = auth || client.auth;
    if (!ticket || ticket.roomCode !== this.state.roomCode) {
      throw new ServerError(403, "This arena ticket belongs to another scrapbook.");
    }

    const existing = this.state.players.get(ticket.userId);
    if (existing?.connected) {
      throw new ServerError(409, "This player is already connected to the arena.");
    }
    if (existing) this.state.players.delete(ticket.userId);

    const spawnIndex = this.state.players.size % ARENA_SPAWNS.length;
    const spawn = ARENA_SPAWNS[spawnIndex];
    const player = new ArenaPlayerState({
      avatarUrl: ticket.avatarUrl || "",
      connected: true,
      health: 100,
      item: emptyStateItem(),
      name: ticket.name,
      pitch: 0,
      score: 0,
      userId: ticket.userId,
      x: spawn.x,
      y: 0,
      yaw: spawn.yaw,
      z: spawn.z,
    });

    client.userData = { userId: ticket.userId };
    this.inventoryByUser.set(ticket.userId, ticket.inventory);
    this.inputByUser.set(ticket.userId, { ...EMPTY_INPUT, yaw: spawn.yaw });
    this.state.players.set(ticket.userId, player);
    this.equipPlayer(player);

    if (this.state.players.size === 2) this.startCountdown();
  }

  async onDrop(client: ArenaRoomClient) {
    const userId = client.userData?.userId;
    const player = userId ? this.state.players.get(userId) : undefined;
    if (player) player.connected = false;

    try {
      await this.allowReconnection(client, 10);
    } catch {
      if (userId) this.removePlayer(userId);
    }
  }

  onReconnect(client: ArenaRoomClient) {
    const player = this.state.players.get(client.userData?.userId || "");
    if (player) player.connected = true;
  }

  onLeave(client: ArenaRoomClient) {
    const userId = client.userData?.userId;
    if (userId) this.removePlayer(userId);
  }

  private receiveInput(client: ArenaRoomClient, message: unknown) {
    if (!message || typeof message !== "object") return;
    const input = message as Record<string, unknown>;
    if (!finite(input.forward) || !finite(input.strafe) || !finite(input.yaw) || !finite(input.pitch)) return;

    this.inputByUser.set(client.userData?.userId || "", {
      forward: clamp(input.forward as number, -1, 1),
      strafe: clamp(input.strafe as number, -1, 1),
      yaw: clamp(input.yaw as number, -Math.PI * 4, Math.PI * 4),
      pitch: clamp(input.pitch as number, -1.35, 1.35),
    });
  }

  private shoot(client: ArenaRoomClient) {
    if (this.state.phase !== "playing") return;
    const userId = client.userData?.userId || "";
    const player = this.state.players.get(userId);
    if (!player || !player.connected || player.health <= 0) return;

    const now = Date.now();
    if (now - (this.lastShotAt.get(userId) || 0) < SHOT_COOLDOWN_MS) return;
    this.lastShotAt.set(userId, now);

    const input = this.inputByUser.get(userId) || EMPTY_INPUT;
    const horizontal = Math.cos(input.pitch);
    const vx = -Math.sin(input.yaw) * horizontal * ARENA_PROJECTILE_SPEED;
    const vy = Math.sin(input.pitch) * ARENA_PROJECTILE_SPEED;
    const vz = -Math.cos(input.yaw) * horizontal * ARENA_PROJECTILE_SPEED;
    const id = randomUUID();
    const projectile = new ArenaProjectileState({
      id,
      ownerId: userId,
      vx,
      vy,
      vz,
      x: player.x + (vx / ARENA_PROJECTILE_SPEED) * 0.65,
      y: ARENA_PLAYER_HEIGHT - 0.15,
      z: player.z + (vz / ARENA_PROJECTILE_SPEED) * 0.65,
    });
    this.state.projectiles.set(id, projectile);
    this.projectileRuntime.set(id, { age: 0, expiresAt: now + 2_500 });
  }

  private updateWorld(deltaTimeMs: number) {
    const now = Date.now();
    this.advancePhase(now);
    if (this.state.phase !== "playing") return;

    const delta = Math.min(deltaTimeMs / 1000, 0.05);
    this.state.players.forEach((player) => this.movePlayer(player, delta));
    this.state.projectiles.forEach((projectile) => this.moveProjectile(projectile, delta, now));
  }

  private advancePhase(now: number) {
    if (!this.state.phaseEndsAt || now < this.state.phaseEndsAt) return;
    if (this.state.phase === "countdown") {
      this.state.phase = "playing";
      this.state.phaseEndsAt = 0;
      return;
    }
    if (this.state.phase !== "round-over") return;
    if (this.state.winnerId) {
      this.state.phase = "match-end";
      this.state.phaseEndsAt = 0;
      return;
    }

    this.state.round += 1;
    this.state.eliminatedPlayerId = "";
    this.state.players.forEach((player) => {
      player.health = 100;
      this.equipPlayer(player);
    });
    this.positionPlayersAtSpawns();
    this.state.phase = "countdown";
    this.state.phaseEndsAt = now + COUNTDOWN_MS;
  }

  private movePlayer(player: ArenaPlayerState, delta: number) {
    const input = this.inputByUser.get(player.userId) || EMPTY_INPUT;
    player.yaw = input.yaw;
    player.pitch = input.pitch;
    if (!player.connected || player.health <= 0) return;

    let forward = input.forward;
    let strafe = input.strafe;
    const length = Math.hypot(forward, strafe);
    if (length > 1) {
      forward /= length;
      strafe /= length;
    }

    const distance = ARENA_MOVE_SPEED * delta;
    const dx = (-Math.sin(input.yaw) * forward + Math.cos(input.yaw) * strafe) * distance;
    const dz = (-Math.cos(input.yaw) * forward - Math.sin(input.yaw) * strafe) * distance;
    if (!isArenaPositionBlocked(player.x + dx, player.z)) player.x += dx;
    if (!isArenaPositionBlocked(player.x, player.z + dz)) player.z += dz;
  }

  private moveProjectile(projectile: ArenaProjectileState, delta: number, now: number) {
    const runtime = this.projectileRuntime.get(projectile.id);
    if (!runtime) {
      this.removeProjectile(projectile.id);
      return;
    }

    const previousX = projectile.x;
    const previousY = projectile.y;
    const previousZ = projectile.z;
    projectile.x += projectile.vx * delta;
    projectile.y += projectile.vy * delta;
    projectile.z += projectile.vz * delta;
    runtime.age += delta;

    if (runtime.age > 0.12) {
      const victim = Array.from(this.state.players.values()).find((player) =>
        player.userId !== projectile.ownerId &&
        player.health > 0 &&
        this.projectileIntersectsPlayer(
          previousX,
          previousY,
          previousZ,
          projectile.x,
          projectile.y,
          projectile.z,
          player,
        )
      );
      if (victim) {
        this.resolveHit(projectile.ownerId, victim.userId, now);
        return;
      }
    }

    if (
      now >= runtime.expiresAt ||
      isArenaProjectileBlocked(projectile.x, projectile.y, projectile.z)
    ) {
      this.removeProjectile(projectile.id);
    }
  }

  private projectileIntersectsPlayer(
    x1: number,
    y1: number,
    z1: number,
    x2: number,
    y2: number,
    z2: number,
    player: ArenaPlayerState,
  ) {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const denominator = dx * dx + dz * dz;
    const t = denominator > 0
      ? clamp(((player.x - x1) * dx + (player.z - z1) * dz) / denominator, 0, 1)
      : 0;
    const closestX = x1 + dx * t;
    const closestZ = z1 + dz * t;
    const closestY = y1 + (y2 - y1) * t;
    return Math.hypot(player.x - closestX, player.z - closestZ) <= ARENA_PLAYER_RADIUS + 0.2 &&
      closestY >= 0.05 &&
      closestY <= ARENA_PLAYER_HEIGHT + 0.25;
  }

  private resolveHit(killerId: string, victimId: string, now: number) {
    if (this.state.phase !== "playing") return;
    const killer = this.state.players.get(killerId);
    const victim = this.state.players.get(victimId);
    if (!killer || !victim) return;

    victim.health = 0;
    killer.score += 1;
    this.state.eliminatedPlayerId = victimId;
    if (killer.score >= ARENA_ROUNDS_TO_WIN) {
      this.state.winnerId = killerId;
      this.state.resultReason = "score";
    }
    this.clearProjectiles();
    this.state.phase = "round-over";
    this.state.phaseEndsAt = now + ROUND_BREAK_MS;
  }

  private startCountdown() {
    this.state.round = 1;
    this.state.winnerId = "";
    this.state.resultReason = "";
    this.state.eliminatedPlayerId = "";
    this.state.players.forEach((player) => {
      player.health = 100;
      player.score = 0;
      this.equipPlayer(player);
    });
    this.positionPlayersAtSpawns();
    this.state.phase = "countdown";
    this.state.phaseEndsAt = Date.now() + COUNTDOWN_MS;
  }

  private equipPlayer(player: ArenaPlayerState) {
    const inventory = this.inventoryByUser.get(player.userId) || [];
    const item = inventory[(Math.max(this.state.round, 1) - 1) % Math.max(inventory.length, 1)];
    player.item = item ? stateItem(item) : emptyStateItem();
  }

  private positionPlayersAtSpawns() {
    Array.from(this.state.players.values()).forEach((player, index) => {
      const spawn = ARENA_SPAWNS[index % ARENA_SPAWNS.length];
      player.x = spawn.x;
      player.y = 0;
      player.z = spawn.z;
      player.yaw = spawn.yaw;
      player.pitch = 0;
      this.inputByUser.set(player.userId, { ...EMPTY_INPUT, yaw: spawn.yaw });
    });
  }

  private removeProjectile(id: string) {
    this.projectileRuntime.delete(id);
    this.state.projectiles.delete(id);
  }

  private clearProjectiles() {
    this.projectileRuntime.clear();
    this.state.projectiles.clear();
  }

  private removePlayer(userId: string) {
    const player = this.state.players.get(userId);
    if (!player) return;
    player.connected = false;
    this.inputByUser.delete(userId);
    this.inventoryByUser.delete(userId);
    this.lastShotAt.delete(userId);

    const opponent = Array.from(this.state.players.values()).find((candidate) =>
      candidate.userId !== userId && candidate.connected
    );
    if (opponent && this.state.phase !== "match-end") {
      this.clearProjectiles();
      this.state.winnerId = opponent.userId;
      this.state.resultReason = "forfeit";
      this.state.phase = "match-end";
      this.state.phaseEndsAt = 0;
    } else if (!opponent) {
      this.state.players.delete(userId);
      this.state.phase = "waiting";
      this.state.round = 0;
      this.state.phaseEndsAt = 0;
    }
  }
}
