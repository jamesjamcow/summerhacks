export const MEMORY_MODEL_MIME_TYPE = "application/json";

export function isMemoryModelFileType(value: string | null | undefined) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === MEMORY_MODEL_MIME_TYPE;
}

export const MEMORY_MODEL_SHAPES = [
  "box",
  "sphere",
  "cylinder",
  "cone",
  "capsule",
  "torus",
  "dodecahedron",
] as const;

export type MemoryModelShape = (typeof MEMORY_MODEL_SHAPES)[number];
export type MemoryModelVector = [number, number, number];

export type MemoryModelPart = {
  shape: MemoryModelShape;
  color: string;
  position: MemoryModelVector;
  rotation: MemoryModelVector;
  scale: MemoryModelVector;
};

export type MemoryModelSpec = {
  version: 1;
  name: string;
  parts: MemoryModelPart[];
};

const shapeSet = new Set<string>(MEMORY_MODEL_SHAPES);

function finiteNumber(value: unknown, minimum: number, maximum: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(maximum, Math.max(minimum, value))
    : null;
}

function vector(
  value: unknown,
  minimum: number,
  maximum: number,
): MemoryModelVector | null {
  if (!Array.isArray(value) || value.length !== 3) return null;

  const values = value.map((entry) => finiteNumber(entry, minimum, maximum));
  return values.every((entry): entry is number => entry !== null)
    ? [values[0], values[1], values[2]]
    : null;
}

function color(value: unknown) {
  return typeof value === "string" && /^#[0-9a-f]{6}$/i.test(value)
    ? value.toLowerCase()
    : null;
}

export function parseMemoryModelSpec(
  value: unknown,
  limits: { maximumParts?: number; minimumParts?: number } = {},
): MemoryModelSpec {
  if (!value || typeof value !== "object") {
    throw new Error("The generated model is not a JSON object.");
  }

  const candidate = value as Record<string, unknown>;
  const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 80) : "";
  if (!name) throw new Error("The generated model has no name.");
  const minimumParts = limits.minimumParts ?? 1;
  const maximumParts = limits.maximumParts ?? 16;
  if (!Array.isArray(candidate.parts) || candidate.parts.length < minimumParts) {
    throw new Error("The generated model has no parts.");
  }

  const parts = candidate.parts.slice(0, maximumParts).map((value, index) => {
    if (!value || typeof value !== "object") {
      throw new Error(`Model part ${index + 1} is invalid.`);
    }

    const part = value as Record<string, unknown>;
    const shape = typeof part.shape === "string" && shapeSet.has(part.shape)
      ? (part.shape as MemoryModelShape)
      : null;
    const partColor = color(part.color);
    const position = vector(part.position, -4, 4);
    const rotation = vector(part.rotation, -Math.PI * 2, Math.PI * 2);
    const scale = vector(part.scale, 0.05, 4);

    if (!shape || !partColor || !position || !rotation || !scale) {
      throw new Error(`Model part ${index + 1} has invalid geometry or material values.`);
    }

    return { shape, color: partColor, position, rotation, scale };
  });

  return { version: 1, name, parts };
}

export async function fetchMemoryModelSpec(modelUrl: string) {
  const response = await fetch(modelUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Could not load the memory model (${response.status}).`);
  }

  return parseMemoryModelSpec(await response.json());
}

export const FALLBACK_MEMORY_MODEL: MemoryModelSpec = {
  version: 1,
  name: "memory",
  parts: [
    {
      shape: "sphere",
      color: "#ef6255",
      position: [-0.32, 0.55, 0],
      rotation: [0, 0, 0],
      scale: [0.72, 0.72, 0.48],
    },
    {
      shape: "sphere",
      color: "#ef6255",
      position: [0.32, 0.55, 0],
      rotation: [0, 0, 0],
      scale: [0.72, 0.72, 0.48],
    },
    {
      shape: "box",
      color: "#ef6255",
      position: [0, 0.23, 0],
      rotation: [0, 0, Math.PI / 4],
      scale: [0.88, 0.88, 0.5],
    },
  ],
};
