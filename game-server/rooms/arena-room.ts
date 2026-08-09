import { randomUUID } from "node:crypto";

import {
  Room,
  ServerError,
  type Client,
} from "@colyseus/core";

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
import { createArenaResultReceipt } from "../../src/lib/arena-result-receipt";
import {
  ARENA_MOVE_SPEED,
  ARENA_PLAYER_HEIGHT,
  ARENA_PLAYER_RADIUS,
  ARENA_GRAVITY,
  ARENA_JUMP_SPEED,
  ARENA_PROJECTILE_SPEED,
  ARENA_ROUNDS_TO_WIN,
  ARENA_SPAWNS,
  getArenaLandingHeight,
  isArenaPositionBlocked,
  isArenaProjectileBlocked,
} from "../../src/lib/arena-world";

type ArenaInput = {
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
  jump: boolean;
};

type ArenaRoomClient = Client<{
  auth: ArenaTicketPayload;
  userData: { userId: string };
}>;

type ProjectileRuntime = {
  age: number;
  expiresAt: number;
};

type PlayerMotionRuntime = {
  grounded: boolean;
  jumpHeld: boolean;
  jumpQueued: boolean;
  verticalVelocity: number;
};

const COUNTDOWN_MS = 3_000;
const ROUND_BREAK_MS = 3_000;
const SHOT_COOLDOWN_MS = 320;
const PROJECTILE_LIFETIME_MS = 4_000;
const EMPTY_INPUT: ArenaInput = {
  forward: 0,
  strafe: 0,
  yaw: 0,
  pitch: 0,
  jump: false,
};

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
    originalImageUrl: item.originalImageUrl || "",
  });
}

function emptyStateItem() {
  return new ArenaItemState({
    id: "",
    imageUrl: "",
    memoryLabel: "",
    modelUrl: "",
    name: "memory",
    originalImageUrl: "",
  });
}

function copyStateItem(item: ArenaItemState) {
  return new ArenaItemState({
    id: item.id,
    imageUrl: item.imageUrl,
    memoryLabel: item.memoryLabel,
    modelUrl: item.modelUrl,
    name: item.name,
    originalImageUrl: item.originalImageUrl,
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
    impactItem: emptyStateItem(),
    matchId: "",
    phase: "waiting",
    phaseEndsAt: 0,
    resultReason: "",
    resultReceipt: "",
    roomCode: "",
    round: 0,
    winnerId: "",
  });

  private readonly inputByUser = new Map<string, ArenaInput>();
  private readonly inventoryByUser = new Map<string, ArenaTicketItem[]>();
  private readonly inventoryCursorByUser = new Map<string, number>();
  private readonly lastShotAt = new Map<string, number>();
  private readonly motionByUser = new Map<string, PlayerMotionRuntime>();
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
      inventoryIndex: 0,
      inventorySize: ticket.inventory.length,
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
    this.inventoryCursorByUser.set(ticket.userId, 0);
    this.inputByUser.set(ticket.userId, { ...EMPTY_INPUT, yaw: spawn.yaw });
    this.motionByUser.set(ticket.userId, {
      grounded: true,
      jumpHeld: false,
      jumpQueued: false,
      verticalVelocity: 0,
    });
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

    const userId = client.userData?.userId || "";
    const jump = input.jump === true;
    const motion = this.motionByUser.get(userId);
    if (motion) {
      if (jump && !motion.jumpHeld) motion.jumpQueued = true;
      motion.jumpHeld = jump;
    }

    this.inputByUser.set(userId, {
      forward: clamp(input.forward as number, -1, 1),
      strafe: clamp(input.strafe as number, -1, 1),
      yaw: clamp(input.yaw as number, -Math.PI * 4, Math.PI * 4),
      pitch: clamp(input.pitch as number, -1.35, 1.35),
      jump,
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
      item: copyStateItem(player.item),
      ownerId: userId,
      vx,
      vy,
      vz,
      x: player.x + (vx / ARENA_PROJECTILE_SPEED) * 0.65,
      y: player.y + ARENA_PLAYER_HEIGHT - 0.15,
      z: player.z + (vz / ARENA_PROJECTILE_SPEED) * 0.65,
    });
    this.state.projectiles.set(id, projectile);
    this.projectileRuntime.set(id, { age: 0, expiresAt: now + PROJECTILE_LIFETIME_MS });
    this.advanceInventory(player);
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
      this.sealResult(now);
      return;
    }

    this.state.round += 1;
    this.state.eliminatedPlayerId = "";
    this.state.impactItem = emptyStateItem();
    this.state.players.forEach((player) => {
      player.health = 100;
    });
    this.positionPlayersAtSpawns();
    this.state.phase = "countdown";
    this.state.phaseEndsAt = now + COUNTDOWN_MS;
  }

  private movePlayer(player: ArenaPlayerState, delta: number) {
    const input = this.inputByUser.get(player.userId) || EMPTY_INPUT;
    const motion = this.motionByUser.get(player.userId);
    player.yaw = input.yaw;
    player.pitch = input.pitch;
    if (!player.connected || player.health <= 0 || !motion) return;

    if (motion.jumpQueued && motion.grounded) {
      motion.grounded = false;
      motion.verticalVelocity = ARENA_JUMP_SPEED;
    }
    motion.jumpQueued = false;

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
    if (!isArenaPositionBlocked(player.x + dx, player.y, player.z)) player.x += dx;
    if (!isArenaPositionBlocked(player.x, player.y, player.z + dz)) player.z += dz;

    if (motion.grounded) {
      const support = getArenaLandingHeight(
        player.x,
        player.z,
        player.y + 0.06,
        player.y - 0.06,
      );
      if (support === undefined || Math.abs(support - player.y) > 0.08) {
        motion.grounded = false;
      }
    }

    if (!motion.grounded) {
      motion.verticalVelocity -= ARENA_GRAVITY * delta;
      const nextY = player.y + motion.verticalVelocity * delta;
      const landingHeight = motion.verticalVelocity <= 0
        ? getArenaLandingHeight(player.x, player.z, player.y, nextY)
        : undefined;
      if (landingHeight !== undefined) {
        player.y = landingHeight;
        motion.grounded = true;
        motion.verticalVelocity = 0;
      } else {
        player.y = Math.max(0, nextY);
      }
    }
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
        this.resolveHit(projectile.ownerId, victim.userId, projectile.item, now);
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
      closestY >= player.y + 0.05 &&
      closestY <= player.y + ARENA_PLAYER_HEIGHT + 0.25;
  }

  private resolveHit(
    killerId: string,
    victimId: string,
    impactItem: ArenaItemState,
    now: number,
  ) {
    if (this.state.phase !== "playing") return;
    const killer = this.state.players.get(killerId);
    const victim = this.state.players.get(victimId);
    if (!killer || !victim) return;

    victim.health = 0;
    killer.score += 1;
    this.state.eliminatedPlayerId = victimId;
    this.state.impactItem = copyStateItem(impactItem);
    if (killer.score >= ARENA_ROUNDS_TO_WIN) {
      this.state.winnerId = killerId;
      this.state.resultReason = "score";
    }
    this.clearProjectiles();
    this.state.phase = "round-over";
    this.state.phaseEndsAt = now + ROUND_BREAK_MS;
  }

  private startCountdown() {
    this.state.matchId = randomUUID();
    this.state.round = 1;
    this.state.winnerId = "";
    this.state.resultReason = "";
    this.state.resultReceipt = "";
    this.state.eliminatedPlayerId = "";
    this.state.impactItem = emptyStateItem();
    this.state.players.forEach((player) => {
      player.health = 100;
      player.score = 0;
      this.inventoryCursorByUser.set(player.userId, 0);
      this.equipPlayer(player);
    });
    this.positionPlayersAtSpawns();
    this.state.phase = "countdown";
    this.state.phaseEndsAt = Date.now() + COUNTDOWN_MS;
  }

  private equipPlayer(player: ArenaPlayerState) {
    const inventory = this.inventoryByUser.get(player.userId) || [];
    const cursor = this.inventoryCursorByUser.get(player.userId) || 0;
    const item = inventory[cursor % Math.max(inventory.length, 1)];
    player.inventoryIndex = item ? cursor % inventory.length : 0;
    player.inventorySize = inventory.length;
    player.item = item ? stateItem(item) : emptyStateItem();
  }

  private advanceInventory(player: ArenaPlayerState) {
    const inventory = this.inventoryByUser.get(player.userId) || [];
    if (!inventory.length) return;
    const nextCursor = ((this.inventoryCursorByUser.get(player.userId) || 0) + 1) % inventory.length;
    this.inventoryCursorByUser.set(player.userId, nextCursor);
    this.equipPlayer(player);
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
      this.motionByUser.set(player.userId, {
        grounded: true,
        jumpHeld: false,
        jumpQueued: false,
        verticalVelocity: 0,
      });
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
    this.inventoryCursorByUser.delete(userId);
    this.lastShotAt.delete(userId);
    this.motionByUser.delete(userId);

    const opponent = Array.from(this.state.players.values()).find((candidate) =>
      candidate.userId !== userId && candidate.connected
    );
    if (opponent && this.state.phase !== "match-end") {
      this.clearProjectiles();
      this.state.winnerId = opponent.userId;
      this.state.resultReason = "forfeit";
      this.state.phase = "match-end";
      this.state.phaseEndsAt = 0;
      this.sealResult(Date.now());
    } else if (!opponent) {
      this.state.players.delete(userId);
      this.state.phase = "waiting";
      this.state.round = 0;
      this.state.phaseEndsAt = 0;
    }
  }

  private sealResult(completedAt: number) {
    if (this.state.resultReceipt || !this.state.matchId || !this.state.winnerId) return;
    const players = Array.from(this.state.players.values()).map((player) => ({
      name: player.name,
      score: player.score,
      userId: player.userId,
    }));
    if (players.length !== 2) return;

    const winner = players.find((player) => player.userId === this.state.winnerId);
    if (!winner || (this.state.resultReason !== "score" && this.state.resultReason !== "forfeit")) {
      return;
    }

    const firstTicket = Array.from(this.clients).map((client) => client.auth).find(Boolean);
    if (!firstTicket) return;
    this.state.resultReceipt = createArenaResultReceipt({
      completedAt,
      matchId: this.state.matchId,
      players,
      resultReason: this.state.resultReason,
      roomCode: this.state.roomCode,
      roomId: firstTicket.roomId,
      version: 1,
      winnerId: winner.userId,
    });
  }
}
