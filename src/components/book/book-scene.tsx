"use client";

import { RoundedBox } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import { PAGE_LEAVES } from "./book-content";

const PAGE_WIDTH = 2.72;
const PAGE_HEIGHT = 3.64;
const BOOK_SCALE_MULTIPLIER = 1.3;
const CANVAS_OVERSCAN = 2;
const OVERSCAN_CAMERA_FOV = 69.107;
const PAGE_SEGMENTS = 48;
const PAGE_SPRING_STRENGTH = 44;
const PAGE_SPRING_DAMPING = 11.5;

type BookSceneProps = {
  currentSpread: number;
  dragPreview?: {
    direction: "next" | "previous";
    progress: number;
  };
  onPrevious: () => void;
  onNext: () => void;
};

function seededRandom(seedText: string) {
  let seed = Array.from(seedText).reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    2166136261,
  );

  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.arcTo(x + width, y, x + width, y + height, safeRadius);
  context.arcTo(x + width, y + height, x, y + height, safeRadius);
  context.arcTo(x, y + height, x, y, safeRadius);
  context.arcTo(x, y, x + width, y, safeRadius);
  context.closePath();
}

function makePageTexture(side: "left" | "right") {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");

  const paper = context.createLinearGradient(0, 0, 768, 1024);
  paper.addColorStop(0, "#fff8e5");
  paper.addColorStop(0.5, "#f6e9c9");
  paper.addColorStop(1, "#ead8ae");
  context.fillStyle = paper;
  context.fillRect(0, 0, 768, 1024);

  const random = seededRandom(`summerhacks-blank-${side}`);
  for (let index = 0; index < 2600; index += 1) {
    const value = Math.floor(random() * 90 + 70);
    context.fillStyle = `rgba(${value}, ${value - 14}, ${value - 32}, ${0.018 + random() * 0.026})`;
    context.fillRect(random() * 768, random() * 1024, random() * 2 + 0.5, random() * 1.2 + 0.35);
  }

  const gutter = context.createLinearGradient(
    side === "right" ? 0 : 768,
    0,
    side === "right" ? 130 : 638,
    0,
  );
  gutter.addColorStop(0, "rgba(72, 36, 22, 0.26)");
  gutter.addColorStop(0.42, "rgba(91, 49, 30, 0.075)");
  gutter.addColorStop(1, "rgba(91, 49, 30, 0)");
  context.fillStyle = gutter;
  context.fillRect(side === "right" ? 0 : 638, 0, 130, 1024);

  context.strokeStyle = "rgba(85, 55, 37, 0.16)";
  context.lineWidth = 2;
  roundedRect(context, 34, 34, 700, 956, 10);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function makeLeatherTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");

  const gradient = context.createRadialGradient(256, 196, 20, 256, 256, 430);
  gradient.addColorStop(0, "#66402f");
  gradient.addColorStop(0.52, "#3b2418");
  gradient.addColorStop(1, "#21130d");
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  const random = seededRandom("summerhacks-leather");
  for (let index = 0; index < 4800; index += 1) {
    const alpha = 0.018 + random() * 0.055;
    context.fillStyle = random() > 0.5 ? `rgba(255, 216, 174, ${alpha})` : `rgba(20, 4, 9, ${alpha})`;
    context.fillRect(random() * 512, random() * 512, random() * 2.2 + 0.5, random() * 2.2 + 0.5);
  }

  context.strokeStyle = "rgba(241, 162, 111, 0.48)";
  context.lineWidth = 3;
  roundedRect(context, 20, 20, 472, 472, 18);
  context.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(1.4, 1.8);
  return texture;
}

function usePageTexture(side: "left" | "right", mirror = false) {
  const texture = useMemo(() => {
    const nextTexture = makePageTexture(side);
    if (mirror) {
      nextTexture.wrapS = THREE.RepeatWrapping;
      nextTexture.repeat.x = -1;
      nextTexture.offset.x = 1;
    }
    return nextTexture;
  }, [mirror, side]);

  useEffect(() => () => texture.dispose(), [texture]);
  return texture;
}

function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  return reducedMotion;
}

function StaticPage({
  side,
  onClick,
}: {
  side: "left" | "right";
  onClick?: () => void;
}) {
  const texture = usePageTexture(side);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered]);

  return (
    <mesh
      castShadow
      onClick={
        onClick
          ? (event) => {
              event.stopPropagation();
              onClick();
            }
          : undefined
      }
      onPointerOut={() => setHovered(false)}
      onPointerOver={onClick ? () => setHovered(true) : undefined}
      position={[(side === "left" ? -1 : 1) * (PAGE_WIDTH / 2), 0, 0.055]}
      receiveShadow
    >
      <planeGeometry args={[PAGE_WIDTH, PAGE_HEIGHT, 2, 2]} />
      <meshStandardMaterial map={texture} roughness={0.9} side={THREE.FrontSide} />
    </mesh>
  );
}

function PageLeaf({
  index,
  currentSpread,
  dragPreview,
  reducedMotion,
  onNext,
  onPrevious,
}: {
  index: number;
  currentSpread: number;
  dragPreview?: BookSceneProps["dragPreview"];
  reducedMotion: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const frontMesh = useRef<THREE.Mesh<THREE.PlaneGeometry>>(null);
  const frontTexture = usePageTexture("right");
  const backTexture = usePageTexture("left", true);
  const turned = index < currentSpread;
  const isForwardPage = index === currentSpread;
  const isBackPage = index === currentSpread - 1;
  const isInteractive = isForwardPage || isBackPage;
  const progress = useRef(turned ? 1 : 0);
  const velocity = useRef(0);
  const [hovered, setHovered] = useState(false);

  const geometry = useMemo(() => {
    const nextGeometry = new THREE.PlaneGeometry(PAGE_WIDTH, PAGE_HEIGHT, PAGE_SEGMENTS, 2);
    nextGeometry.translate(PAGE_WIDTH / 2, 0, 0);
    return nextGeometry;
  }, []);
  const basePositions = useMemo(
    () => Float32Array.from(geometry.attributes.position.array as ArrayLike<number>),
    [geometry],
  );

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => {
    if (!hovered || !isInteractive) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, isInteractive]);

  useFrame((_, delta) => {
    if (!group.current || !frontMesh.current) return;

    const settledTarget = turned ? 1 : 0;
    const isDraggedLeaf =
      (dragPreview?.direction === "next" && isForwardPage) ||
      (dragPreview?.direction === "previous" && isBackPage);
    const isBoundaryLeaf = turned ? isBackPage : isForwardPage;
    const shouldInterpolate = isDraggedLeaf || (!dragPreview && isBoundaryLeaf);
    let target = settledTarget;

    if (dragPreview?.direction === "next" && isForwardPage) {
      target = dragPreview.progress;
    } else if (dragPreview?.direction === "previous" && isBackPage) {
      target = 1 - dragPreview.progress;
    }

    // Keep only one sheet in the turning arc. Skipped and inactive leaves snap
    // to their stack so their reversing depth order cannot become coplanar.
    if (!shouldInterpolate) {
      progress.current = settledTarget;
      velocity.current = 0;
    } else if (reducedMotion) {
      progress.current = target;
      velocity.current = 0;
    } else if (isDraggedLeaf) {
      progress.current = THREE.MathUtils.damp(progress.current, target, 28, delta);
      velocity.current = 0;
    } else {
      const frameDelta = Math.min(delta, 1 / 30);
      velocity.current +=
        (target - progress.current) * PAGE_SPRING_STRENGTH * frameDelta;
      velocity.current *= Math.exp(-PAGE_SPRING_DAMPING * frameDelta);
      progress.current = THREE.MathUtils.clamp(
        progress.current + velocity.current * frameDelta,
        0,
        1,
      );

      if (
        Math.abs(target - progress.current) < 0.0005 &&
        Math.abs(velocity.current) < 0.0005
      ) {
        progress.current = target;
        velocity.current = 0;
      }
    }

    const value = THREE.MathUtils.clamp(progress.current, 0, 1);
    const eased = THREE.MathUtils.smootherstep(value, 0, 1);
    const lift = Math.sin(value * Math.PI);
    const unturnedDepth = 0.18 - index * 0.025;
    const turnedDepth = 0.105 + index * 0.018;

    group.current.rotation.y = -Math.PI * eased;
    group.current.rotation.z = -0.018 * lift;
    group.current.position.z =
      THREE.MathUtils.lerp(unturnedDepth, turnedDepth, eased) + lift * 0.22;

    const liveGeometry = frontMesh.current.geometry;
    const position = liveGeometry.attributes.position as THREE.BufferAttribute;
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      const baseIndex = vertex * 3;
      const baseX = basePositions[baseIndex];
      const normalizedX = Math.max(0, Math.min(1, baseX / PAGE_WIDTH));
      const arch = Math.sin(normalizedX * Math.PI);
      const curl = arch * lift * 0.34 + arch * 0.018;
      const edgeKick = Math.pow(normalizedX, 4) * lift * 0.09;

      position.setXYZ(
        vertex,
        baseX - arch * lift * 0.035,
        basePositions[baseIndex + 1],
        curl + edgeKick,
      );
    }
    position.needsUpdate = true;
    liveGeometry.computeVertexNormals();
  });

  const handleClick = (event: ThreeEvent<MouseEvent>) => {
    if (!isInteractive) return;
    event.stopPropagation();
    if (isBackPage) onPrevious();
    else if (isForwardPage) onNext();
  };

  return (
    <group ref={group} renderOrder={20 + index}>
      <mesh
        castShadow
        geometry={geometry}
        onClick={isInteractive ? handleClick : undefined}
        onPointerOut={() => setHovered(false)}
        onPointerOver={isInteractive ? () => setHovered(true) : undefined}
        receiveShadow
        ref={frontMesh}
      >
        <meshStandardMaterial
          map={frontTexture}
          roughness={0.9}
          side={THREE.FrontSide}
        />
      </mesh>
      <mesh
        castShadow
        geometry={geometry}
        onClick={isInteractive ? handleClick : undefined}
        onPointerOut={() => setHovered(false)}
        onPointerOver={isInteractive ? () => setHovered(true) : undefined}
        receiveShadow
      >
        <meshStandardMaterial
          map={backTexture}
          roughness={0.9}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}

function BookModel(props: BookSceneProps & { reducedMotion: boolean }) {
  const book = useRef<THREE.Group>(null);
  const { pointer, viewport } = useThree();
  const leatherTexture = useMemo(() => makeLeatherTexture(), []);
  const scale =
    BOOK_SCALE_MULTIPLIER *
    Math.min(
      1,
      viewport.width / (6.35 * CANVAS_OVERSCAN),
      viewport.height / (4.35 * CANVAS_OVERSCAN),
    );

  useEffect(() => () => leatherTexture.dispose(), [leatherTexture]);

  useFrame((_, delta) => {
    if (!book.current) return;
    const response = 1 - Math.exp(-delta * 2.8);
    const pointerScale = props.reducedMotion ? 0 : 1;
    book.current.rotation.x = THREE.MathUtils.lerp(
      book.current.rotation.x,
      -0.14 + pointer.y * 0.035 * pointerScale,
      response,
    );
    book.current.rotation.y = THREE.MathUtils.lerp(
      book.current.rotation.y,
      pointer.x * 0.055 * pointerScale,
      response,
    );
    book.current.rotation.z = THREE.MathUtils.lerp(
      book.current.rotation.z,
      -pointer.x * 0.018 * pointerScale,
      response,
    );
  });

  return (
    <group ref={book} position={[0, -0.02, 0]} scale={scale}>
      <RoundedBox
        args={[PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.22, 0.14]}
        castShadow
        position={[-PAGE_WIDTH / 2 - 0.045, 0, -0.19]}
        radius={0.085}
        smoothness={5}
      >
        <meshStandardMaterial map={leatherTexture} metalness={0.02} roughness={0.74} />
      </RoundedBox>
      <RoundedBox
        args={[PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.22, 0.14]}
        castShadow
        position={[PAGE_WIDTH / 2 + 0.045, 0, -0.19]}
        radius={0.085}
        smoothness={5}
      >
        <meshStandardMaterial map={leatherTexture} metalness={0.02} roughness={0.74} />
      </RoundedBox>

      <RoundedBox
        args={[PAGE_WIDTH + 0.02, PAGE_HEIGHT + 0.04, 0.19]}
        castShadow
        position={[-PAGE_WIDTH / 2 - 0.006, 0, -0.075]}
        radius={0.045}
        smoothness={3}
      >
        <meshStandardMaterial color="#cfad79" roughness={0.95} />
      </RoundedBox>
      <RoundedBox
        args={[PAGE_WIDTH + 0.02, PAGE_HEIGHT + 0.04, 0.19]}
        castShadow
        position={[PAGE_WIDTH / 2 + 0.006, 0, -0.075]}
        radius={0.045}
        smoothness={3}
      >
        <meshStandardMaterial color="#cfad79" roughness={0.95} />
      </RoundedBox>

      {Array.from({ length: 7 }, (_, index) => (
        <group key={index} position={[0, 0, -0.125 + index * 0.026]}>
          <mesh position={[-PAGE_WIDTH / 2, 0, 0]}>
            <boxGeometry args={[PAGE_WIDTH - 0.035, PAGE_HEIGHT - 0.05, 0.009]} />
            <meshStandardMaterial color={index % 2 ? "#ead4a8" : "#f0ddba"} roughness={1} />
          </mesh>
          <mesh position={[PAGE_WIDTH / 2, 0, 0]}>
            <boxGeometry args={[PAGE_WIDTH - 0.035, PAGE_HEIGHT - 0.05, 0.009]} />
            <meshStandardMaterial color={index % 2 ? "#ead4a8" : "#f0ddba"} roughness={1} />
          </mesh>
        </group>
      ))}

      <mesh castShadow position={[0, 0, -0.135]} scale={[1, 1, 0.72]}>
        <cylinderGeometry args={[0.19, 0.19, PAGE_HEIGHT + 0.24, 28]} />
        <meshStandardMaterial map={leatherTexture} roughness={0.78} />
      </mesh>

      <mesh position={[-PAGE_WIDTH - 0.08, 0, -0.105]}>
        <boxGeometry args={[0.022, PAGE_HEIGHT + 0.05, 0.17]} />
        <meshStandardMaterial color="#c48c55" metalness={0.25} roughness={0.58} />
      </mesh>
      <mesh position={[PAGE_WIDTH + 0.08, 0, -0.105]}>
        <boxGeometry args={[0.022, PAGE_HEIGHT + 0.05, 0.17]} />
        <meshStandardMaterial color="#c48c55" metalness={0.25} roughness={0.58} />
      </mesh>

      <StaticPage
        onClick={props.currentSpread > 0 ? props.onPrevious : undefined}
        side="left"
      />
      <StaticPage side="right" />

      {PAGE_LEAVES.map((leaf, index) => (
        <PageLeaf
          currentSpread={props.currentSpread}
          dragPreview={props.dragPreview}
          index={index}
          key={leaf.front.title}
          onNext={props.onNext}
          onPrevious={props.onPrevious}
          reducedMotion={props.reducedMotion}
        />
      ))}

      <mesh position={[0, 0, 0.2]}>
        <planeGeometry args={[0.13, PAGE_HEIGHT - 0.08]} />
        <meshBasicMaterial color="#5b2c22" opacity={0.12} transparent />
      </mesh>
    </group>
  );
}

function Scene(props: BookSceneProps) {
  const reducedMotion = useReducedMotion();

  return (
    <>
      <ambientLight intensity={1.35} />
      <hemisphereLight color="#fff5e8" groundColor="#c7b6a7" intensity={1.65} />
      <directionalLight
        castShadow
        color="#ffe0b3"
        intensity={3.4}
        position={[-3.5, 5.5, 7]}
        shadow-bias={-0.0004}
        shadow-mapSize-height={1536}
        shadow-mapSize-width={1536}
      />
      <pointLight color="#ed6459" intensity={16} position={[4, -2, 4]} />

      <BookModel {...props} reducedMotion={reducedMotion} />

      <mesh position={[0, 0, -0.72]} receiveShadow>
        <planeGeometry args={[16, 10]} />
        <shadowMaterial opacity={0.34} transparent />
      </mesh>
    </>
  );
}

export default function BookScene(props: BookSceneProps) {
  return (
    <div className="book-canvas-shell">
      <Canvas
        aria-label="An interactive open book. Drag a page left to move forward or right to move back."
        camera={{
          fov: OVERSCAN_CAMERA_FOV,
          near: 0.1,
          far: 50,
          position: [0, 0.18, 7.7],
        }}
        dpr={[1, 1.65]}
        fallback={<div className="book-webgl-fallback">Your browser could not open the 3D book.</div>}
        gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.08;
        }}
        shadows
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
