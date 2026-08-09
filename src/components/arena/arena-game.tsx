"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { MemoryModelPreview } from "@/components/memory-model-preview";
import type {
  ArenaPlayerSnapshot,
  ArenaProjectileSnapshot,
} from "@/lib/arena-realtime";
import { ARENA_BLOCKS } from "@/lib/arena-world";
import { createMemoryModel, disposeMemoryModel } from "@/lib/three-memory-model";

import {
  getPreloadedArenaImage,
  getPreloadedArenaModel,
  preloadArenaAssets,
} from "./arena-assets";
import type { ArenaItem } from "./arena-types";
import type { ArenaInputMessage } from "./use-colyseus-arena";

type ArenaGameProps = {
  active: boolean;
  item: ArenaItem;
  localPlayer: ArenaPlayerSnapshot;
  onInput: (input: ArenaInputMessage) => void;
  onShoot: () => void;
  players: Record<string, ArenaPlayerSnapshot>;
  projectiles: Record<string, ArenaProjectileSnapshot>;
};

type ProjectileVisual = {
  dispose: () => void;
  object: THREE.Object3D;
  ownerId: string;
};

const PLAYER_HEIGHT = 1.65;

function makeCardTexture(imageUrl: string) {
  const preloaded = getPreloadedArenaImage(imageUrl);
  if (!preloaded) return undefined;
  const texture = new THREE.Texture(preloaded);
  texture.needsUpdate = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function makeOpponentLabel(name: string) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");
  context.fillStyle = "rgba(11, 15, 20, 0.82)";
  context.roundRect(8, 8, 496, 112, 24);
  context.fill();
  context.strokeStyle = "#ffdb41";
  context.lineWidth = 6;
  context.stroke();
  context.fillStyle = "#ffffff";
  context.font = "800 46px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name.slice(0, 24), 256, 66);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createOpponent(name: string) {
  const group = new THREE.Group();
  const dark = new THREE.MeshStandardMaterial({ color: "#27234e", flatShading: true });
  const skin = new THREE.MeshStandardMaterial({ color: "#ffb47a", flatShading: true });
  const accent = new THREE.MeshStandardMaterial({ color: "#49ccd1", flatShading: true });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.75, 5, 10), dark);
  body.position.y = 1.05;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.38, 0), skin);
  head.position.y = 2.05;
  head.castShadow = true;
  group.add(head);

  [-1, 1].forEach((side) => {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.12, 0.62, 4, 8), accent);
    arm.position.set(side * 0.58, 1.18, 0);
    arm.rotation.z = side * -0.22;
    arm.castShadow = true;
    group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 0.72, 4, 8), dark);
    leg.position.set(side * 0.23, 0.25, 0);
    leg.rotation.z = side * 0.08;
    leg.castShadow = true;
    group.add(leg);
  });

  const labelTexture = makeOpponentLabel(name);
  const labelMaterial = new THREE.SpriteMaterial({
    depthTest: false,
    map: labelTexture,
    transparent: true,
  });
  const label = new THREE.Sprite(labelMaterial);
  label.position.y = 2.85;
  label.scale.set(3.2, 0.8, 1);
  group.add(label);

  return {
    dispose: () => {
      labelTexture.dispose();
      labelMaterial.dispose();
      disposeMemoryModel(group);
    },
    group,
  };
}

function arenaItem(item: ArenaPlayerSnapshot["item"]): ArenaItem {
  return {
    id: item.id,
    imageUrl: item.imageUrl || undefined,
    memoryLabel: item.memoryLabel,
    modelUrl: item.modelUrl || undefined,
    name: item.name,
    originalImageUrl: item.originalImageUrl || undefined,
  };
}

function projectileVisual(item: ArenaProjectileSnapshot["item"]): ProjectileVisual | undefined {
  if (item.modelUrl) {
    const modelSpec = getPreloadedArenaModel(item.modelUrl);
    if (!modelSpec) return undefined;
    const object = createMemoryModel(modelSpec, 0.9);
    return {
      dispose: () => disposeMemoryModel(object),
      object,
      ownerId: "",
    };
  }

  if (!item.imageUrl) return undefined;
  const texture = makeCardTexture(item.imageUrl);
  if (!texture) return undefined;
  const material = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
  });
  const object = new THREE.Mesh(new THREE.PlaneGeometry(0.72, 0.72), material);
  return {
    dispose: () => {
      object.geometry.dispose();
      material.dispose();
      texture.dispose();
    },
    object,
    ownerId: "",
  };
}

export default function ArenaGame({
  active,
  item,
  localPlayer,
  onInput,
  onShoot,
  players,
  projectiles,
}: ArenaGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const inputHandlerRef = useRef(onInput);
  const localPlayerRef = useRef(localPlayer);
  const playersRef = useRef(players);
  const projectilesRef = useRef(projectiles);
  const shootHandlerRef = useRef(onShoot);
  const previousHealthRef = useRef(localPlayer.health);
  const [locked, setLocked] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { inputHandlerRef.current = onInput; }, [onInput]);
  useEffect(() => { shootHandlerRef.current = onShoot; }, [onShoot]);
  useEffect(() => { localPlayerRef.current = localPlayer; }, [localPlayer]);
  useEffect(() => { playersRef.current = players; }, [players]);
  useEffect(() => { projectilesRef.current = projectiles; }, [projectiles]);

  useEffect(() => {
    if (localPlayer.health < previousHealthRef.current) {
      setHitFlash(true);
      const timer = window.setTimeout(() => setHitFlash(false), 140);
      previousHealthRef.current = localPlayer.health;
      return () => window.clearTimeout(timer);
    }
    previousHealthRef.current = localPlayer.health;
  }, [localPlayer.health]);

  useEffect(() => {
    if (!active && document.pointerLockElement) document.exitPointerLock();
  }, [active]);

  const opponent = Object.values(players).find((player) => player.userId !== localPlayer.userId);

  useEffect(() => {
    const mount = mountRef.current;
    const initialLocalPlayer = localPlayerRef.current;
    const initialOpponent = Object.values(playersRef.current).find(
      (player) => player.userId !== initialLocalPlayer.userId,
    );
    if (!mount || !initialOpponent) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#86c8d4");
    scene.fog = new THREE.Fog("#86c8d4", 18, 48);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 90);
    camera.position.set(initialLocalPlayer.x, PLAYER_HEIGHT, initialLocalPlayer.z);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.domElement.className = "arena-world-canvas";
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#d9fbff", "#70554a", 2.2));
    const sun = new THREE.DirectionalLight("#fff0d2", 3.2);
    sun.position.set(-8, 14, 5);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    scene.add(sun);
    const environment: THREE.Mesh[] = [];
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(70, 70),
      new THREE.MeshStandardMaterial({ color: "#6e7567", roughness: 0.96 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);
    environment.push(ground);
    ARENA_BLOCKS.forEach((block) => {
      const mesh = new THREE.Mesh(
        new THREE.BoxGeometry(block.width, block.height, block.depth),
        new THREE.MeshStandardMaterial({ color: block.color, roughness: 0.82, flatShading: true }),
      );
      mesh.position.set(block.x, block.y, block.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
      environment.push(mesh);
    });

    const opponentModel = createOpponent(initialOpponent.name);
    scene.add(opponentModel.group);
    const projectileVisuals = new Map<string, ProjectileVisual>();
    const requestedProjectileAssets = new Set<string>();
    const requestProjectileAsset = (projectileItem: ArenaProjectileSnapshot["item"]) => {
      const assetKey = projectileItem.modelUrl || projectileItem.imageUrl;
      if (!assetKey || requestedProjectileAssets.has(assetKey)) return;
      if (
        (projectileItem.modelUrl && getPreloadedArenaModel(projectileItem.modelUrl)) ||
        (projectileItem.imageUrl && getPreloadedArenaImage(projectileItem.imageUrl))
      ) return;
      requestedProjectileAssets.add(assetKey);
      void preloadArenaAssets([arenaItem(projectileItem)]).catch(() => undefined);
    };
    const keys = new Set<string>();
    const clock = new THREE.Clock();
    let yaw = initialLocalPlayer.yaw;
    let pitch = initialLocalPlayer.pitch;
    let lastInputAt = 0;

    const resize = () => {
      const { clientWidth, clientHeight } = mount;
      renderer.setSize(clientWidth, clientHeight, false);
      camera.aspect = clientWidth / Math.max(clientHeight, 1);
      camera.updateProjectionMatrix();
    };
    resize();
    const onKeyDown = (event: KeyboardEvent) => keys.add(event.code);
    const onKeyUp = (event: KeyboardEvent) => keys.delete(event.code);
    const onPointerLock = () => setLocked(document.pointerLockElement === renderer.domElement);
    const onMouseMove = (event: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      yaw -= event.movementX * 0.0022;
      pitch = THREE.MathUtils.clamp(pitch - event.movementY * 0.002, -1.35, 1.35);
    };
    const throwMemory = (event: MouseEvent) => {
      if (!activeRef.current) return;
      if (document.pointerLockElement !== renderer.domElement) {
        void renderer.domElement.requestPointerLock().catch(() => undefined);
        return;
      }
      if (event.button !== 0) return;
      shootHandlerRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    document.addEventListener("pointerlockchange", onPointerLock);
    document.addEventListener("mousemove", onMouseMove);
    renderer.domElement.addEventListener("mousedown", throwMemory);
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    let frame = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.05);
      const now = performance.now();
      const local = localPlayerRef.current;
      const distance = Math.hypot(camera.position.x - local.x, camera.position.z - local.z);
      const follow = distance > 4 ? 1 : 1 - Math.exp(-14 * delta);
      camera.position.x = THREE.MathUtils.lerp(camera.position.x, local.x, follow);
      camera.position.y = PLAYER_HEIGHT;
      camera.position.z = THREE.MathUtils.lerp(camera.position.z, local.z, follow);
      camera.rotation.set(pitch, yaw, 0, "YXZ");

      if (now - lastInputAt >= 45) {
        inputHandlerRef.current({
          forward: activeRef.current
            ? Number(keys.has("KeyW")) - Number(keys.has("KeyS"))
            : 0,
          strafe: activeRef.current
            ? Number(keys.has("KeyD")) - Number(keys.has("KeyA"))
            : 0,
          yaw,
          pitch,
        });
        lastInputAt = now;
      }

      const currentOpponent = Object.values(playersRef.current).find(
        (player) => player.userId !== local.userId,
      );
      if (currentOpponent) {
        opponentModel.group.position.set(currentOpponent.x, currentOpponent.y, currentOpponent.z);
        opponentModel.group.rotation.y = currentOpponent.yaw;
        opponentModel.group.visible = currentOpponent.health > 0;
      }
      Object.values(playersRef.current).forEach((player) => requestProjectileAsset(player.item));

      const snapshots = projectilesRef.current;
      Object.values(snapshots).forEach((projectile) => {
        let visual = projectileVisuals.get(projectile.id);
        if (!visual) {
          visual = projectileVisual(projectile.item);
          if (!visual) {
            requestProjectileAsset(projectile.item);
            return;
          }
          visual.ownerId = projectile.ownerId;
          visual.object.position.set(projectile.x, projectile.y, projectile.z);
          projectileVisuals.set(projectile.id, visual);
          scene.add(visual.object);
        }
        const smoothing = 1 - Math.exp(-22 * delta);
        visual.object.position.lerp(
          new THREE.Vector3(projectile.x, projectile.y, projectile.z),
          smoothing,
        );
        visual.object.rotation.x += delta * 5.5;
        visual.object.rotation.y += delta * 7.5;
      });
      projectileVisuals.forEach((visual, id) => {
        if (snapshots[id]) return;
        scene.remove(visual.object);
        visual.dispose();
        projectileVisuals.delete(id);
      });
      renderer.render(scene, camera);
    };
    animate();

    return () => {
      inputHandlerRef.current({ forward: 0, strafe: 0, yaw, pitch });
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onPointerLock);
      document.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mousedown", throwMemory);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      projectileVisuals.forEach((visual) => visual.dispose());
      opponentModel.dispose();
      environment.forEach((mesh) => {
        mesh.geometry.dispose();
        const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        materials.forEach((material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [localPlayer.userId, opponent?.name, opponent?.userId]);

  return (
    <div className={hitFlash ? "arena-game is-hit" : "arena-game"} ref={mountRef}>
      {localPlayer.avatarUrl ? (
        <div
          className="arena-player-avatar"
          aria-hidden="true"
          style={{ backgroundImage: `url(${localPlayer.avatarUrl})` }}
        />
      ) : null}
      <div className="arena-feed">
        <span>Throw at {opponent?.name ?? "the other player"}</span>
        <span>Equipped: {item.name}</span>
      </div>
      <div className="arena-crosshair" aria-hidden="true"><i /><i /></div>
      <div className="arena-hand" aria-hidden="true">
        {item.modelUrl ? (
          <MemoryModelPreview className="arena-held-model" modelUrl={item.modelUrl} name={item.name} />
        ) : (
          <div
            className="arena-held-image"
            style={item.imageUrl ? { backgroundImage: `url(${item.imageUrl})` } : undefined}
          >♥</div>
        )}
      </div>
      <div className="arena-ammo">
        <small>MEMORY LOOP</small>
        <strong>{localPlayer.inventoryIndex + 1}<span>/{localPlayer.inventorySize}</span></strong>
      </div>
      <div className="arena-controls"><span>W A S D</span> move <span>CLICK</span> throw <span>ESC</span> cursor</div>
      {!locked && active ? (
        <button
          className="arena-start"
          onClick={() => {
            const request = mountRef.current
              ?.querySelector<HTMLCanvasElement>(".arena-world-canvas")
              ?.requestPointerLock();
            void request?.catch(() => undefined);
          }}
          type="button"
        >
          <strong>ENTER THE ROUND</strong>
          <span>Click to capture your cursor</span>
        </button>
      ) : null}
    </div>
  );
}
