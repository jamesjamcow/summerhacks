export const MEMORY_MODEL_MIME_TYPE = "application/json";

export const MEMORY_ITEM_TYPES = ["weapon", "power-up"] as const;
export type MemoryItemType = (typeof MEMORY_ITEM_TYPES)[number];

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
  /** Optional only so model artifacts created before item classification remain readable. */
  itemType?: MemoryItemType;
  parts: MemoryModelPart[];
};

export type ClassifiedMemoryModelSpec = MemoryModelSpec & {
  itemType: MemoryItemType;
};

const shapeSet = new Set<string>(MEMORY_MODEL_SHAPES);
const itemTypeSet = new Set<string>(MEMORY_ITEM_TYPES);
const modelKeys = new Set(["version", "name", "itemType", "parts"]);
const partKeys = new Set(["shape", "color", "position", "rotation", "scale"]);

const OBVIOUS_POWER_UP_PATTERNS = [
  /\b(?:bug|insect|beetle|cricket|ant|butterfly)\b/i,
  /\b(?:water|juice|coffee|tea|milk|soda|pop|lemonade|smoothie|drink|beverage)\b/i,
  /\b(?:bottle|cup|mug|flask|canteen|thermos)\b/i,
  /\b(?:apple|banana|berry|bread|burger|cake|candy|chocolate|cookie|donut|doughnut|egg|food|fries|fruit|hot dog|ice cream|meal|pizza|sandwich|snack|soup|taco)\b/i,
  /\b(?:medicine|potion|vitamin|elixir|energy drink|protein shake)\b/i,
] as const;

export function isMemoryItemType(value: unknown): value is MemoryItemType {
  return typeof value === "string" && itemTypeSet.has(value);
}

/**
 * Keeps legacy artifacts deterministic and corrects the most obvious Gemini
 * misclassifications without trying to replace visual reasoning in code.
 */
export function resolveMemoryItemType(
  name: string,
  proposedType?: unknown,
): MemoryItemType {
  if (OBVIOUS_POWER_UP_PATTERNS.some((pattern) => pattern.test(name))) {
    return "power-up";
  }
  return isMemoryItemType(proposedType) ? proposedType : "weapon";
}

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
  limits: {
    maximumParts?: number;
    minimumParts?: number;
    requireItemType?: boolean;
  } = {},
): MemoryModelSpec {
  if (!value || typeof value !== "object") {
    throw new Error("The generated model is not a JSON object.");
  }

  const candidate = value as Record<string, unknown>;
  if (candidate.version !== 1) {
    throw new Error("The generated model has an unsupported version.");
  }
  if (Object.keys(candidate).some((key) => !modelKeys.has(key))) {
    throw new Error("The generated model contains unexpected properties.");
  }
  const name = typeof candidate.name === "string" ? candidate.name.trim().slice(0, 80) : "";
  if (!name) throw new Error("The generated model has no name.");
  const itemType = isMemoryItemType(candidate.itemType) ? candidate.itemType : undefined;
  if (limits.requireItemType && !itemType) {
    throw new Error("The generated model has no valid gameplay item type.");
  }
  const minimumParts = limits.minimumParts ?? 1;
  const maximumParts = limits.maximumParts ?? 16;
  if (!Array.isArray(candidate.parts) || candidate.parts.length < minimumParts) {
    throw new Error("The generated model has no parts.");
  }
  if (candidate.parts.length > maximumParts) {
    throw new Error("The generated model has too many parts.");
  }

  const parts = candidate.parts.map((value, index) => {
    if (!value || typeof value !== "object") {
      throw new Error(`Model part ${index + 1} is invalid.`);
    }

    const part = value as Record<string, unknown>;
    if (Object.keys(part).some((key) => !partKeys.has(key))) {
      throw new Error(`Model part ${index + 1} contains unexpected properties.`);
    }
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

  return {
    version: 1,
    name,
    ...(itemType ? { itemType } : {}),
    parts,
  };
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
