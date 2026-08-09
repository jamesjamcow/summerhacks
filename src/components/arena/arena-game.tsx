"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

import { CharacterAvatarPreview } from "@/components/character-avatar-preview";
import { MemoryModelPreview } from "@/components/memory-model-preview";
import type {
  ArenaPlayerSnapshot,
  ArenaProjectileSnapshot,
} from "@/lib/arena-realtime";
import {
  ARENA_GROUND_DEPTH,
  ARENA_GROUND_WIDTH,
  type ArenaBiome,
  type ArenaBlock,
  type ArenaDecoration,
  type ArenaMapLandmark,
  type ArenaMapSpec,
} from "@/lib/arena-world";
import {
  fetchCharacterAvatarSpec,
  type CharacterAvatarSpec,
} from "@/lib/character-avatar";
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
  map: ArenaMapSpec;
  onInput: (input: ArenaInputMessage) => void;
  onUseItem: () => void;
  players: Record<string, ArenaPlayerSnapshot>;
  projectiles: Record<string, ArenaProjectileSnapshot>;
};

type ProjectileVisual = {
  dispose: () => void;
  object: THREE.Object3D;
  ownerId: string;
};

const PLAYER_HEIGHT = 1.65;

function standardMaterial(color: string, options: {
  emissive?: string;
  emissiveIntensity?: number;
  roughness?: number;
} = {}) {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: options.emissive,
    emissiveIntensity: options.emissiveIntensity,
    flatShading: true,
    roughness: options.roughness ?? 0.84,
  });
}

function shadowed(mesh: THREE.Mesh, receiveShadow = true) {
  mesh.castShadow = true;
  mesh.receiveShadow = receiveShadow;
  return mesh;
}

function createEnvironmentBlock(block: ArenaBlock) {
  const group = new THREE.Group();
  group.position.set(block.x, block.y, block.z);

  const base = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(block.width, block.height, block.depth),
    standardMaterial(block.color, { roughness: block.style === "stone" ? 0.95 : 0.82 }),
  ));
  group.add(base);

  const trimColor = new THREE.Color(block.color).multiplyScalar(0.72);
  const cap = shadowed(new THREE.Mesh(
    new THREE.BoxGeometry(block.width + 0.06, 0.1, block.depth + 0.06),
    standardMaterial(`#${trimColor.getHexString()}`),
  ));
  cap.position.y = block.height / 2 + 0.05;
  group.add(cap);

  if (block.style === "timber") {
    const slatCount = Math.max(2, Math.min(6, Math.round(block.width / 1.5)));
    for (let index = 1; index < slatCount; index += 1) {
      const x = -block.width / 2 + (block.width * index) / slatCount;
      [-1, 1].forEach((side) => {
        const slat = shadowed(new THREE.Mesh(
          new THREE.BoxGeometry(0.1, block.height * 0.88, 0.07),
          standardMaterial("#5a382c"),
        ));
        slat.position.set(x, 0, side * (block.depth / 2 + 0.035));
        group.add(slat);
      });
    }
  }

  if (block.style === "planter") {
    const shrubCount = Math.max(2, Math.floor(block.width / 1.7));
    for (let index = 0; index < shrubCount; index += 1) {
      const shrub = shadowed(new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.48 + (index % 2) * 0.08, 0),
        standardMaterial(index % 2 ? "#496b51" : "#5d7d55"),
      ));
      shrub.position.set(
        -block.width / 2 + ((index + 0.5) * block.width) / shrubCount,
        block.height / 2 + 0.35,
        0,
      );
      group.add(shrub);
    }
  }

  if (block.style === "wall") {
    const inset = shadowed(new THREE.Mesh(
      new THREE.BoxGeometry(block.width > block.depth ? block.width * 0.96 : block.width + 0.04, 0.28, block.width > block.depth ? block.depth + 0.05 : block.depth * 0.96),
      standardMaterial("#414c49"),
    ));
    inset.position.y = block.height / 2 - 0.42;
    group.add(inset);
  }

  return group;
}

function biomeFoliage(biome: ArenaBiome) {
  switch (biome) {
    case "snowfield": return ["#e9f3ec", "#c8dcd1", "#8ba89b"] as const;
    case "desert": return ["#87934f", "#a7a45d", "#c8ad69"] as const;
    case "beach": return ["#3f9568", "#55aa72", "#a7bd69"] as const;
    case "indoor-hall": return ["#64746f", "#7d8c82", "#a0a58b"] as const;
    case "forest": return ["#2f6247", "#3f7452", "#56865e"] as const;
    default: return ["#47745b", "#588364", "#718957"] as const;
  }
}

function createDecoration(decoration: ArenaDecoration, biome: ArenaBiome) {
  const group = new THREE.Group();
  const scale = decoration.scale ?? 1;
  const foliage = biomeFoliage(biome);
  group.position.set(decoration.x, 0, decoration.z);
  group.rotation.y = decoration.rotation ?? 0;
  group.scale.setScalar(scale);

  if (decoration.kind === "tree") {
    const trunk = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(0.3, 0.48, 3.4, 7),
      standardMaterial("#624734"),
    ));
    trunk.position.y = 1.7;
    group.add(trunk);
    [
      [-0.55, 3.45, 0.1, 1.25],
      [0.48, 3.85, 0.15, 1.35],
      [0, 4.55, -0.15, 1.2],
    ].forEach(([x, y, z, radius], index) => {
      const crown = shadowed(new THREE.Mesh(
        new THREE.DodecahedronGeometry(radius, 0),
        standardMaterial(index === 1 ? foliage[0] : foliage[1]),
      ));
      crown.position.set(x, y, z);
      group.add(crown);
    });
  } else if (decoration.kind === "lamp") {
    const pole = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.11, 3.25, 8),
      standardMaterial("#293d43", { roughness: 0.55 }),
    ));
    pole.position.y = 1.63;
    group.add(pole);
    const shade = shadowed(new THREE.Mesh(
      new THREE.ConeGeometry(0.34, 0.48, 8),
      standardMaterial("#304d51"),
    ));
    shade.position.y = 3.34;
    shade.rotation.x = Math.PI;
    group.add(shade);
    const glow = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.19, 1),
      standardMaterial("#ffe8a3", { emissive: "#ffc94a", emissiveIntensity: 2 }),
    );
    glow.position.y = 3.15;
    group.add(glow);
  } else if (decoration.kind === "flag") {
    const pole = shadowed(new THREE.Mesh(
      new THREE.CylinderGeometry(0.035, 0.055, 2.5, 6),
      standardMaterial("#313c40"),
    ));
    pole.position.y = 3.8;
    group.add(pole);
    const flag = shadowed(new THREE.Mesh(
      new THREE.PlaneGeometry(1.35, 0.72),
      new THREE.MeshStandardMaterial({
        color: decoration.color ?? "#ef6657",
        roughness: 0.72,
        side: THREE.DoubleSide,
      }),
    ), false);
    flag.position.set(0.7, 4.65, 0);
    group.add(flag);
  } else if (decoration.kind === "rock") {
    const rock = shadowed(new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.65, 0),
      standardMaterial("#6c7774", { roughness: 1 }),
    ));
    rock.scale.set(1.35, 0.65, 0.9);
    rock.position.y = 0.38;
    group.add(rock);
  } else {
    for (let index = 0; index < 5; index += 1) {
      const bladeHeight = 0.72 + (index % 2) * 0.18;
      const blade = shadowed(new THREE.Mesh(
        new THREE.ConeGeometry(0.09, bladeHeight, 4),
        standardMaterial(index % 2 ? foliage[2] : foliage[1]),
      ), false);
      blade.position.set((index - 2) * 0.13, bladeHeight / 2, (index % 2) * 0.1);
      blade.rotation.z = (index - 2) * 0.1;
      group.add(blade);
    }
  }

  return group;
}

function createArenaEnvironment(map: ArenaMapSpec) {
  const root = new THREE.Group();
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(ARENA_GROUND_WIDTH, ARENA_GROUND_DEPTH),
    standardMaterial(map.groundColor, { roughness: 0.98 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  root.add(ground);

  const pathMaterial = standardMaterial(map.pathColor, { roughness: 1 });
  const eastWestPath = new THREE.Mesh(new THREE.PlaneGeometry(51, 5.2), pathMaterial);
  eastWestPath.rotation.x = -Math.PI / 2;
  eastWestPath.position.y = 0.012;
  eastWestPath.receiveShadow = true;
  root.add(eastWestPath);
  const northSouthPath = new THREE.Mesh(
    new THREE.PlaneGeometry(5.2, 43),
    standardMaterial(new THREE.Color(map.pathColor).multiplyScalar(0.94).getStyle(), { roughness: 1 }),
  );
  northSouthPath.rotation.x = -Math.PI / 2;
  northSouthPath.position.y = 0.016;
  northSouthPath.receiveShadow = true;
  root.add(northSouthPath);

  const memoryRing = new THREE.Mesh(
    new THREE.RingGeometry(7.4, 7.72, 64),
    standardMaterial(map.accentColor, { emissive: map.accentColor, emissiveIntensity: 0.18 }),
  );
  memoryRing.rotation.x = -Math.PI / 2;
  memoryRing.position.y = 0.025;
  root.add(memoryRing);

  map.blocks.forEach((block) => root.add(createEnvironmentBlock(block)));
  map.decorations.forEach((decoration) => root.add(createDecoration(decoration, map.biome)));
  return root;
}

function createArenaLandmark(landmark: ArenaMapLandmark, accentColor: string) {
  const group = new THREE.Group();
  group.position.set(landmark.x, 0, landmark.z);
  group.rotation.y = landmark.rotation;

  const plinth = shadowed(new THREE.Mesh(
    new THREE.CylinderGeometry(1.35, 1.55, 0.55, 10),
    standardMaterial(accentColor, { roughness: 0.9 }),
  ));
  plinth.position.y = 0.275;
  group.add(plinth);

  let texture: THREE.Texture | undefined;
  if (landmark.modelUrl) {
    const spec = getPreloadedArenaModel(landmark.modelUrl);
    if (!spec) return undefined;
    const model = createMemoryModel(spec, 2.8 * landmark.scale);
    model.position.y = 0.55;
    group.add(model);
  } else if (landmark.imageUrl) {
    texture = makeCardTexture(landmark.imageUrl);
    if (!texture) return undefined;
    const card = shadowed(new THREE.Mesh(
      new THREE.PlaneGeometry(2.5 * landmark.scale, 2.5 * landmark.scale),
      new THREE.MeshStandardMaterial({ map: texture, roughness: 0.82, side: THREE.DoubleSide }),
    ));
    card.position.y = 1.9;
    group.add(card);
  } else {
    return undefined;
  }

  return {
    dispose: () => {
      disposeMemoryModel(group);
      texture?.dispose();
    },
    group,
  };
}

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

function createOpponent(name: string, avatarSpec?: CharacterAvatarSpec) {
  const group = new THREE.Group();
  if (avatarSpec) {
    group.add(createMemoryModel(avatarSpec, 2.35));
  } else {
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
  }

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
    itemType: item.itemType,
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
  map,
  onInput,
  onUseItem,
  players,
  projectiles,
}: ArenaGameProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const inputHandlerRef = useRef(onInput);
  const localPlayerRef = useRef(localPlayer);
  const playersRef = useRef(players);
  const projectilesRef = useRef(projectiles);
  const useItemHandlerRef = useRef(onUseItem);
  const previousHealthRef = useRef(localPlayer.health);
  const [locked, setLocked] = useState(false);
  const [hitFlash, setHitFlash] = useState(false);
  const [hudNow, setHudNow] = useState(() => Date.now());
  const mapKey = `${map.source}:${map.themeName}:${map.landmarks.map((landmark) => landmark.id).join(",")}`;

  useEffect(() => { activeRef.current = active; }, [active]);
  useEffect(() => { inputHandlerRef.current = onInput; }, [onInput]);
  useEffect(() => { useItemHandlerRef.current = onUseItem; }, [onUseItem]);
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

  useEffect(() => {
    const timer = window.setInterval(() => setHudNow(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, []);

  const opponent = Object.values(players).find((player) => player.userId !== localPlayer.userId);
  const isConsuming = localPlayer.consumingEndsAt > hudNow;
  const consumeImageUrl = item.originalImageUrl || item.imageUrl;

  useEffect(() => {
    const mount = mountRef.current;
    const initialLocalPlayer = localPlayerRef.current;
    const initialOpponent = Object.values(playersRef.current).find(
      (player) => player.userId !== initialLocalPlayer.userId,
    );
    if (!mount || !initialOpponent) return;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(map.skyColor);
    scene.fog = new THREE.Fog(map.fogColor, 42, 92);
    const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 130);
    camera.position.set(
      initialLocalPlayer.x,
      initialLocalPlayer.y + PLAYER_HEIGHT,
      initialLocalPlayer.z,
    );
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.domElement.className = "arena-world-canvas";
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.HemisphereLight("#e4fdff", "#645246", 2.35));
    const sun = new THREE.DirectionalLight("#fff0d2", 3.4);
    sun.position.set(-17, 24, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -34;
    sun.shadow.camera.right = 34;
    sun.shadow.camera.top = 30;
    sun.shadow.camera.bottom = -30;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 70;
    scene.add(sun);
    const environment = createArenaEnvironment(map);
    scene.add(environment);
    const landmarkVisuals: Array<{ dispose: () => void; group: THREE.Group }> = [];
    let disposed = false;
    const landmarkItems = map.landmarks.map<ArenaItem>((landmark) => ({
      id: landmark.id,
      imageUrl: landmark.imageUrl,
      itemType: "weapon",
      memoryLabel: landmark.name,
      modelUrl: landmark.modelUrl,
      name: landmark.name,
    }));
    void preloadArenaAssets(landmarkItems).then(() => {
      if (disposed) return;
      map.landmarks.forEach((landmark) => {
        const visual = createArenaLandmark(landmark, map.accentColor);
        if (!visual) return;
        landmarkVisuals.push(visual);
        scene.add(visual.group);
      });
    }).catch(() => undefined);

    let opponentModel = createOpponent(initialOpponent.name);
    scene.add(opponentModel.group);
    if (initialOpponent.avatarModelUrl) {
      void fetchCharacterAvatarSpec(initialOpponent.avatarModelUrl)
        .then((spec) => {
          if (disposed) return;
          const nextOpponent = createOpponent(initialOpponent.name, spec);
          nextOpponent.group.position.copy(opponentModel.group.position);
          nextOpponent.group.rotation.copy(opponentModel.group.rotation);
          nextOpponent.group.visible = opponentModel.group.visible;
          scene.remove(opponentModel.group);
          opponentModel.dispose();
          opponentModel = nextOpponent;
          scene.add(opponentModel.group);
        })
        .catch((error) => {
          console.warn("Arena avatar could not be loaded", error);
        });
    }
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
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Space" && document.pointerLockElement === renderer.domElement) {
        event.preventDefault();
      }
      keys.add(event.code);
    };
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
      useItemHandlerRef.current();
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
      camera.position.y = THREE.MathUtils.lerp(
        camera.position.y,
        local.y + PLAYER_HEIGHT,
        1 - Math.exp(-18 * delta),
      );
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
          jump: activeRef.current && keys.has("Space"),
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
      disposed = true;
      inputHandlerRef.current({ forward: 0, strafe: 0, yaw, pitch, jump: false });
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("pointerlockchange", onPointerLock);
      document.removeEventListener("mousemove", onMouseMove);
      renderer.domElement.removeEventListener("mousedown", throwMemory);
      if (document.pointerLockElement === renderer.domElement) document.exitPointerLock();
      projectileVisuals.forEach((visual) => visual.dispose());
      landmarkVisuals.forEach((visual) => {
        scene.remove(visual.group);
        visual.dispose();
      });
      opponentModel.dispose();
      disposeMemoryModel(environment);
      renderer.dispose();
      renderer.domElement.remove();
    };
  // mapKey is deliberately stable across high-frequency Colyseus snapshots.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localPlayer.userId, mapKey, opponent?.avatarModelUrl, opponent?.name, opponent?.userId]);

  return (
    <div className={hitFlash ? "arena-game is-hit" : "arena-game"} ref={mountRef}>
      {localPlayer.avatarModelUrl ? (
        <CharacterAvatarPreview
          className="arena-player-avatar-model"
          modelUrl={localPlayer.avatarModelUrl}
          name={localPlayer.name}
        />
      ) : localPlayer.avatarImageUrl ? (
        <div
          className="arena-player-avatar"
          aria-hidden="true"
          style={{ backgroundImage: `url(${localPlayer.avatarImageUrl})` }}
        />
      ) : null}
      <div className="arena-feed">
        <span>{item.itemType === "power-up" ? "Consume for +20% speed" : `Throw at ${opponent?.name ?? "the other player"}`}</span>
        <span>Equipped: {item.name} · {item.itemType === "power-up" ? "Power-up" : "Weapon"}</span>
        {localPlayer.speedBoostEndsAt > hudNow ? <span className="arena-boost-status">Speed boosted +20%</span> : null}
        {item.itemType === "power-up" && localPlayer.powerUpCooldownEndsAt > hudNow ? (
          <span>Power-up ready in {Math.ceil((localPlayer.powerUpCooldownEndsAt - hudNow) / 1_000)}s</span>
        ) : null}
      </div>
      <div className="arena-crosshair" aria-hidden="true"><i /><i /></div>
      {isConsuming && consumeImageUrl ? (
        <div
          className="arena-consume-image"
          style={{ backgroundImage: `url(${consumeImageUrl})` }}
        />
      ) : null}
      <div
        className={`arena-hand${isConsuming ? " is-consuming" : ""}`}
        aria-hidden="true"
      >
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
      <div className="arena-controls"><span>W A S D</span> move <span>SPACE</span> jump <span>CLICK</span> {item.itemType === "power-up" ? "consume" : "throw"} <span>ESC</span> cursor</div>
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
