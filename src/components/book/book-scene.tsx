"use client";

import { RoundedBox } from "@react-three/drei";
import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

import {
  PAGE_LEAVES,
  STATIC_LEFT_PAGE,
  type PageArtwork,
  type PageContent,
} from "./book-content";

const PAGE_WIDTH = 2.72;
const PAGE_HEIGHT = 3.64;
const BOOK_SCALE_MULTIPLIER = 1.69;
const CANVAS_OVERSCAN = 2;
const OVERSCAN_CAMERA_FOV = 69.107;
const PAGE_SEGMENTS = 48;
const PAGE_SPRING_STRENGTH = 44;
const PAGE_SPRING_DAMPING = 11.5;
const BOOK_OPEN_DURATION = 1.65;

type OpeningProgress = { current: number };

type BookSceneProps = {
  currentSpread: number;
  greetingName: string;
  dragPreview?: {
    direction: "next" | "previous";
    progress: number;
  };
  interactive: boolean;
  open: boolean;
  onOpen: () => void;
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

function wrapText(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";

  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (line && context.measureText(candidate).width > maxWidth) {
      lines.push(line);
      line = word;
    } else {
      line = candidate;
    }
  });

  if (line) lines.push(line);
  return lines;
}

function drawSpacedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
) {
  let cursor = x;
  Array.from(text).forEach((character) => {
    context.fillText(character, cursor, y);
    cursor += context.measureText(character).width + spacing;
  });
}

function drawWrappedRuns(
  context: CanvasRenderingContext2D,
  runs: ReadonlyArray<{ font: string; text: string }>,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
) {
  let cursorX = x;
  let cursorY = y;

  runs.forEach((run) => {
    run.text.split(/\s+/).forEach((word) => {
      context.font = run.font;
      const wordWidth = context.measureText(word).width;
      const spaceWidth = context.measureText(" ").width;

      if (cursorX > x && cursorX + spaceWidth + wordWidth > x + maxWidth) {
        cursorX = x;
        cursorY += lineHeight;
      } else if (cursorX > x) {
        cursorX += spaceWidth;
      }

      context.fillText(word, cursorX, cursorY);
      cursorX += wordWidth;
    });
  });

  return cursorY;
}

function drawPageArtwork(
  context: CanvasRenderingContext2D,
  artwork: PageArtwork,
  accent: string,
  side: "left" | "right",
) {
  const x = side === "left" ? 555 : 580;
  const y = 820;
  context.save();
  context.globalAlpha = 0.46;
  context.strokeStyle = accent;
  context.fillStyle = accent;
  context.lineWidth = 3;

  if (artwork === "sun") {
    context.beginPath();
    context.arc(x, y, 48, 0, Math.PI * 2);
    context.stroke();
    for (let ray = 0; ray < 12; ray += 1) {
      const angle = (ray / 12) * Math.PI * 2;
      context.beginPath();
      context.moveTo(x + Math.cos(angle) * 62, y + Math.sin(angle) * 62);
      context.lineTo(x + Math.cos(angle) * 78, y + Math.sin(angle) * 78);
      context.stroke();
    }
  } else if (artwork === "orbit") {
    context.beginPath();
    context.ellipse(x, y, 72, 35, -0.35, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.arc(x + 57, y - 34, 8, 0, Math.PI * 2);
    context.fill();
  } else if (artwork === "waves") {
    for (let wave = 0; wave < 3; wave += 1) {
      context.beginPath();
      context.moveTo(x - 82, y - 24 + wave * 25);
      context.bezierCurveTo(
        x - 38,
        y - 48 + wave * 25,
        x + 38,
        y + wave * 25,
        x + 82,
        y - 24 + wave * 25,
      );
      context.stroke();
    }
  } else if (artwork === "constellation") {
    const points = [[-58, 32], [-28, -35], [18, 10], [62, -46], [76, 38]];
    context.beginPath();
    points.forEach(([dx, dy], index) => {
      if (index === 0) context.moveTo(x + dx, y + dy);
      else context.lineTo(x + dx, y + dy);
    });
    context.stroke();
    points.forEach(([dx, dy]) => {
      context.beginPath();
      context.arc(x + dx, y + dy, 6, 0, Math.PI * 2);
      context.fill();
    });
  } else if (artwork === "door") {
    roundedRect(context, x - 52, y - 72, 104, 144, 52);
    context.stroke();
    context.beginPath();
    context.arc(x + 27, y + 8, 5, 0, Math.PI * 2);
    context.fill();
  }

  context.restore();
}

function drawPageContent(
  context: CanvasRenderingContext2D,
  content: PageContent,
  side: "left" | "right",
) {
  const x = side === "left" ? 86 : 112;
  const maxWidth = side === "left" ? 528 : 520;

  context.save();
  context.textBaseline = "alphabetic";
  context.fillStyle = content.accent;
  context.font = "700 16px Arial, Helvetica, sans-serif";
  drawSpacedText(context, content.eyebrow.toUpperCase(), x, 247, 2.2);

  context.fillStyle = "#35231a";
  context.font = '600 58px Georgia, "Times New Roman", serif';
  const titleLines = wrapText(context, content.title, maxWidth);
  const titleLineHeight = 59;
  titleLines.forEach((line, index) => {
    context.fillText(line, x, 320 + index * titleLineHeight);
  });

  let cursorY = 320 + titleLines.length * titleLineHeight + 22;
  context.fillStyle = "rgba(53, 35, 26, 0.74)";
  context.font = '25px Georgia, "Times New Roman", serif';
  const bodyLines = wrapText(context, content.body, maxWidth);
  bodyLines.forEach((line, index) => {
    context.fillText(line, x, cursorY + index * 37);
  });
  cursorY += bodyLines.length * 37 + 24;

  if (content.note) {
    context.fillStyle = "rgba(53, 35, 26, 0.62)";
    if (content.noteStrong) {
      cursorY = drawWrappedRuns(
        context,
        [
          {
            font: '23px Georgia, "Times New Roman", serif',
            text: content.note,
          },
          {
            font: '700 23px Georgia, "Times New Roman", serif',
            text: content.noteStrong,
          },
        ],
        x,
        cursorY,
        maxWidth,
        34,
      );
    } else {
      context.font = 'italic 21px Georgia, "Times New Roman", serif';
      context.fillText(content.note, x, cursorY);
    }
  }

  if (content.navigation?.length) {
    const rowHeight = 48;
    const navTop = cursorY - 18;

    context.strokeStyle = "rgba(53, 35, 26, 0.22)";
    context.lineWidth = 1.5;
    context.textAlign = "left";
    context.textBaseline = "middle";
    context.font = "700 16px Arial, Helvetica, sans-serif";
    content.navigation.forEach((item, index) => {
      const rowTop = navTop + index * rowHeight;

      context.beginPath();
      context.moveTo(x, rowTop);
      context.lineTo(x + maxWidth, rowTop);
      context.stroke();

      context.fillStyle = index === 0 ? content.accent : "rgba(53, 35, 26, 0.68)";
      context.fillText(item.toUpperCase(), x + 20, rowTop + rowHeight / 2);

      if (index === 0) {
        context.fillRect(x, rowTop + 9, 4, rowHeight - 18);
      }
    });

    context.beginPath();
    context.moveTo(x, navTop + content.navigation.length * rowHeight);
    context.lineTo(x + maxWidth, navTop + content.navigation.length * rowHeight);
    context.stroke();
  }

  drawPageArtwork(context, content.artwork, content.accent, side);
  context.restore();
}

function makePageTexture(side: "left" | "right", content?: PageContent) {
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

  const random = seededRandom(`summerhacks-${side}-${content?.title ?? "blank"}`);
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

  if (content) drawPageContent(context, content, side);

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

function makeCoverTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 768;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D is unavailable.");

  const leather = context.createRadialGradient(205, 238, 20, 380, 470, 720);
  leather.addColorStop(0, "#754a35");
  leather.addColorStop(0.46, "#4b2c20");
  leather.addColorStop(1, "#24120d");
  context.fillStyle = leather;
  context.fillRect(0, 0, canvas.width, canvas.height);

  const random = seededRandom("summerhacks-cover-face");
  context.save();
  context.globalAlpha = 0.13;
  context.strokeStyle = "#e2a66f";
  context.lineWidth = 1;
  for (let ring = 0; ring < 150; ring += 1) {
    const radius = 18 + ring * 7.5;
    context.beginPath();
    context.ellipse(
      116 + Math.sin(ring * 0.19) * 7,
      310 + Math.cos(ring * 0.13) * 9,
      radius * 1.28,
      radius,
      -0.09,
      0,
      Math.PI * 2,
    );
    context.stroke();
  }
  context.restore();

  for (let index = 0; index < 2600; index += 1) {
    const alpha = 0.012 + random() * 0.035;
    context.fillStyle = random() > 0.5
      ? `rgba(255, 221, 178, ${alpha})`
      : `rgba(18, 4, 2, ${alpha})`;
    context.fillRect(random() * 768, random() * 1024, random() * 2 + 0.4, 0.7);
  }

  const gold = "rgba(244, 205, 155, 0.72)";
  context.strokeStyle = gold;
  context.lineWidth = 2;
  roundedRect(context, 42, 38, 684, 948, 22);
  context.stroke();

  context.beginPath();
  context.moveTo(548, 78);
  context.lineTo(674, 78);
  context.lineTo(674, 212);
  context.moveTo(92, 936);
  context.lineTo(92, 812);
  context.lineTo(222, 812);
  context.stroke();

  context.textAlign = "center";
  context.fillStyle = "rgba(249, 224, 190, 0.76)";
  context.font = "700 19px Arial, Helvetica, sans-serif";
  context.fillText("A  B O O K  O F  U S", 384, 366);

  context.fillStyle = "#f7dfb9";
  context.font = '500 70px Georgia, "Times New Roman", serif';
  context.fillText("SCRAPBOOK", 384, 456);

  context.fillStyle = "rgba(249, 228, 197, 0.78)";
  context.font = 'italic 24px Georgia, "Times New Roman", serif';
  context.fillText("Built by the people who remember you.", 384, 520);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
}

function usePageTexture(
  side: "left" | "right",
  content?: PageContent,
  mirror = false,
) {
  const texture = useMemo(() => {
    const nextTexture = makePageTexture(side, content);
    if (mirror) {
      nextTexture.wrapS = THREE.RepeatWrapping;
      nextTexture.repeat.x = -1;
      nextTexture.offset.x = 1;
    }
    return nextTexture;
  }, [content, mirror, side]);

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

function FoldingGroup({
  children,
  openingProgress,
}: {
  children: React.ReactNode;
  openingProgress: OpeningProgress;
}) {
  const group = useRef<THREE.Group>(null);

  useFrame(() => {
    if (!group.current) return;
    const eased = THREE.MathUtils.smootherstep(openingProgress.current, 0, 1);
    group.current.rotation.y = Math.PI * (1 - eased);
  });

  return <group ref={group}>{children}</group>;
}

function FrontCover({
  coverTexture,
  interactive,
  leatherTexture,
  onOpen,
  openingProgress,
}: {
  coverTexture: THREE.Texture;
  interactive: boolean;
  leatherTexture: THREE.Texture;
  onOpen: () => void;
  openingProgress: OpeningProgress;
}) {
  const group = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  useEffect(() => {
    if (!hovered || !interactive) return;
    document.body.style.cursor = "pointer";
    return () => {
      document.body.style.cursor = "";
    };
  }, [hovered, interactive]);

  useFrame(() => {
    if (!group.current) return;
    const eased = THREE.MathUtils.smootherstep(openingProgress.current, 0, 1);
    group.current.rotation.y = -Math.PI * eased;
    group.current.rotation.z = -Math.sin(eased * Math.PI) * 0.018;
  });

  return (
    <group
      onClick={
        interactive
          ? (event: ThreeEvent<MouseEvent>) => {
              event.stopPropagation();
              onOpen();
            }
          : undefined
      }
      onPointerOut={() => setHovered(false)}
      onPointerOver={interactive ? () => setHovered(true) : undefined}
      ref={group}
    >
      <RoundedBox
        args={[PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.22, 0.14]}
        castShadow
        position={[PAGE_WIDTH / 2 + 0.045, 0, 0.19]}
        radius={0.085}
        smoothness={5}
      >
        <meshStandardMaterial map={leatherTexture} metalness={0.02} roughness={0.72} />
      </RoundedBox>
      <mesh castShadow position={[PAGE_WIDTH / 2 + 0.045, 0, 0.266]}>
        <planeGeometry args={[PAGE_WIDTH + 0.02, PAGE_HEIGHT + 0.06]} />
        <meshStandardMaterial map={coverTexture} roughness={0.79} />
      </mesh>
      <mesh position={[PAGE_WIDTH + 0.08, 0, 0.105]}>
        <boxGeometry args={[0.022, PAGE_HEIGHT + 0.05, 0.17]} />
        <meshStandardMaterial color="#c48c55" metalness={0.25} roughness={0.58} />
      </mesh>
    </group>
  );
}

function StaticPage({
  side,
  content,
  onClick,
}: {
  side: "left" | "right";
  content?: PageContent;
  onClick?: () => void;
}) {
  const texture = usePageTexture(side, content);
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
  interactionEnabled,
  openingProgress,
  reducedMotion,
  onNext,
  onPrevious,
}: {
  index: number;
  currentSpread: number;
  dragPreview?: BookSceneProps["dragPreview"];
  interactionEnabled: boolean;
  openingProgress: OpeningProgress;
  reducedMotion: boolean;
  onNext: () => void;
  onPrevious: () => void;
}) {
  const group = useRef<THREE.Group>(null);
  const frontMesh = useRef<THREE.Mesh<THREE.PlaneGeometry>>(null);
  const frontTexture = usePageTexture("right", PAGE_LEAVES[index].front);
  const backTexture = usePageTexture("left", PAGE_LEAVES[index].back, true);
  const turned = index < currentSpread;
  const isForwardPage = index === currentSpread;
  const isBackPage = index === currentSpread - 1;
  const isInteractive = interactionEnabled && (isForwardPage || isBackPage);
  const progress = useRef(0);
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

    const openingValue = openingProgress.current;
    const openingLeafStart = 0.26 + index * 0.1;
    const openingLeafProgress = THREE.MathUtils.clamp(
      (openingValue - openingLeafStart) / (1 - openingLeafStart),
      0,
      1,
    );
    const isOpeningLeaf = openingValue < 0.999 && turned;
    const settledTarget = isOpeningLeaf
      ? THREE.MathUtils.smootherstep(openingLeafProgress, 0, 1)
      : turned
        ? 1
        : 0;
    const isDraggedLeaf =
      (dragPreview?.direction === "next" && isForwardPage) ||
      (dragPreview?.direction === "previous" && isBackPage);
    const isBoundaryLeaf = turned ? isBackPage : isForwardPage;
    const shouldInterpolate =
      isOpeningLeaf || isDraggedLeaf || (!dragPreview && isBoundaryLeaf);
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
  const openingProgress = useRef(props.open ? 1 : 0);
  const { pointer, viewport } = useThree();
  const leatherTexture = useMemo(() => makeLeatherTexture(), []);
  const coverTexture = useMemo(() => makeCoverTexture(), []);
  const leftPageContent = useMemo(
    () => ({ ...STATIC_LEFT_PAGE, title: `Hey, ${props.greetingName}!` }),
    [props.greetingName],
  );
  const scale =
    BOOK_SCALE_MULTIPLIER *
    Math.min(
      1,
      viewport.width / (6.35 * CANVAS_OVERSCAN),
      viewport.height / (4.35 * CANVAS_OVERSCAN),
    );

  useEffect(
    () => () => {
      coverTexture.dispose();
      leatherTexture.dispose();
    },
    [coverTexture, leatherTexture],
  );

  useFrame((_, delta) => {
    if (!book.current) return;
    const openingTarget = props.open ? 1 : 0;
    if (props.reducedMotion) {
      openingProgress.current = openingTarget;
    } else if (openingProgress.current !== openingTarget) {
      const direction = openingTarget > openingProgress.current ? 1 : -1;
      openingProgress.current = THREE.MathUtils.clamp(
        openingProgress.current + direction * (delta / BOOK_OPEN_DURATION),
        0,
        1,
      );
    }

    const openingEase = THREE.MathUtils.smootherstep(openingProgress.current, 0, 1);
    const response = 1 - Math.exp(-delta * 2.8);
    const pointerScale = props.reducedMotion ? 0 : 1;
    book.current.position.x = THREE.MathUtils.lerp(
      book.current.position.x,
      THREE.MathUtils.lerp(-PAGE_WIDTH / 2, 0, openingEase),
      response,
    );
    book.current.rotation.x = THREE.MathUtils.lerp(
      book.current.rotation.x,
      THREE.MathUtils.lerp(-0.08, -0.14, openingEase) +
        pointer.y * 0.035 * pointerScale,
      response,
    );
    book.current.rotation.y = THREE.MathUtils.lerp(
      book.current.rotation.y,
      THREE.MathUtils.lerp(-0.09, 0, openingEase) +
        pointer.x * 0.055 * pointerScale,
      response,
    );
    book.current.rotation.z = THREE.MathUtils.lerp(
      book.current.rotation.z,
      THREE.MathUtils.lerp(-0.025, 0, openingEase) -
        pointer.x * 0.018 * pointerScale,
      response,
    );
  });

  return (
    <group ref={book} position={[-PAGE_WIDTH / 2, -0.02, 0]} scale={scale}>
      <FrontCover
        coverTexture={coverTexture}
        interactive={!props.open}
        leatherTexture={leatherTexture}
        onOpen={props.onOpen}
        openingProgress={openingProgress}
      />

      <RoundedBox
        args={[PAGE_WIDTH + 0.18, PAGE_HEIGHT + 0.22, 0.14]}
        castShadow
        position={[PAGE_WIDTH / 2 + 0.045, 0, -0.19]}
        radius={0.085}
        smoothness={5}
      >
        <meshStandardMaterial map={leatherTexture} metalness={0.02} roughness={0.74} />
      </RoundedBox>

      <FoldingGroup openingProgress={openingProgress}>
        <RoundedBox
          args={[PAGE_WIDTH + 0.02, PAGE_HEIGHT + 0.04, 0.19]}
          castShadow
          position={[-PAGE_WIDTH / 2 - 0.006, 0, -0.075]}
          radius={0.045}
          smoothness={3}
        >
          <meshStandardMaterial color="#cfad79" roughness={0.95} />
        </RoundedBox>

        {Array.from({ length: 7 }, (_, index) => (
          <mesh
            key={`left-${index}`}
            position={[-PAGE_WIDTH / 2, 0, -0.125 + index * 0.026]}
          >
            <boxGeometry args={[PAGE_WIDTH - 0.035, PAGE_HEIGHT - 0.05, 0.009]} />
            <meshStandardMaterial
              color={index % 2 ? "#ead4a8" : "#f0ddba"}
              roughness={1}
            />
          </mesh>
        ))}

        <StaticPage
          content={leftPageContent}
          onClick={props.interactive && props.currentSpread > 0 ? props.onPrevious : undefined}
          side="left"
        />
      </FoldingGroup>

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
        <mesh
          key={`right-${index}`}
          position={[PAGE_WIDTH / 2, 0, -0.125 + index * 0.026]}
        >
          <boxGeometry args={[PAGE_WIDTH - 0.035, PAGE_HEIGHT - 0.05, 0.009]} />
          <meshStandardMaterial
            color={index % 2 ? "#ead4a8" : "#f0ddba"}
            roughness={1}
          />
        </mesh>
      ))}

      <mesh castShadow position={[0, 0, -0.135]} scale={[1, 1, 0.72]}>
        <cylinderGeometry args={[0.19, 0.19, PAGE_HEIGHT + 0.24, 28]} />
        <meshStandardMaterial map={leatherTexture} roughness={0.78} />
      </mesh>

      <mesh position={[PAGE_WIDTH + 0.08, 0, -0.105]}>
        <boxGeometry args={[0.022, PAGE_HEIGHT + 0.05, 0.17]} />
        <meshStandardMaterial color="#c48c55" metalness={0.25} roughness={0.58} />
      </mesh>

      <StaticPage side="right" />

      {PAGE_LEAVES.map((leaf, index) => (
        <PageLeaf
          currentSpread={props.currentSpread}
          dragPreview={props.dragPreview}
          index={index}
          interactionEnabled={props.interactive}
          key={leaf.front.title}
          onNext={props.onNext}
          onPrevious={props.onPrevious}
          openingProgress={openingProgress}
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
        aria-label={
          props.open
            ? "An interactive open 3D scrapbook. Drag a page left to move forward or right to move back."
            : "A closed interactive 3D scrapbook. Click anywhere on the page to open it."
        }
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
        shadows="basic"
      >
        <Scene {...props} />
      </Canvas>
    </div>
  );
}
