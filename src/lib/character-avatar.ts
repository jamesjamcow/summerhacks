import {
  parseMemoryModelSpec,
  type MemoryModelSpec,
} from "@/lib/memory-model";

export const CHARACTER_AVATAR_MIME_TYPE = "application/vnd.summerhacks.character+json";

export function isCharacterAvatarFileType(value: string | null | undefined) {
  return value?.split(";", 1)[0]?.trim().toLowerCase() === CHARACTER_AVATAR_MIME_TYPE;
}

export type CharacterAvatarSpec = MemoryModelSpec;

export function parseCharacterAvatarSpec(value: unknown): CharacterAvatarSpec {
  const spec = parseMemoryModelSpec(value, { minimumParts: 8, maximumParts: 16 });
  return { ...spec, name: "avatar" };
}

export async function fetchCharacterAvatarSpec(modelUrl: string) {
  const response = await fetch(modelUrl, { cache: "force-cache" });
  if (!response.ok) {
    throw new Error(`Could not load the character avatar (${response.status}).`);
  }
  return parseCharacterAvatarSpec(await response.json());
}

export const FALLBACK_CHARACTER_AVATAR: CharacterAvatarSpec = {
  version: 1,
  name: "avatar",
  parts: [
    { shape: "sphere", color: "#d79a67", position: [0, 2.55, 0], rotation: [0, 0, 0], scale: [0.78, 0.86, 0.72] },
    { shape: "sphere", color: "#432c22", position: [0, 2.82, -0.02], rotation: [0, 0, 0], scale: [0.85, 0.48, 0.77] },
    { shape: "capsule", color: "#b95d3e", position: [0, 1.55, 0], rotation: [0, 0, 0], scale: [1.15, 1.55, 0.78] },
    { shape: "capsule", color: "#d79a67", position: [-0.67, 1.58, 0], rotation: [0, 0, -0.18], scale: [0.42, 1.42, 0.42] },
    { shape: "capsule", color: "#d79a67", position: [0.67, 1.58, 0], rotation: [0, 0, 0.18], scale: [0.42, 1.42, 0.42] },
    { shape: "capsule", color: "#3e5260", position: [-0.29, 0.55, 0], rotation: [0, 0, -0.04], scale: [0.5, 1.55, 0.5] },
    { shape: "capsule", color: "#3e5260", position: [0.29, 0.55, 0], rotation: [0, 0, 0.04], scale: [0.5, 1.55, 0.5] },
    { shape: "box", color: "#35231a", position: [-0.3, 0.08, 0.08], rotation: [0, 0, 0], scale: [0.56, 0.2, 1.0] },
    { shape: "box", color: "#35231a", position: [0.3, 0.08, 0.08], rotation: [0, 0, 0], scale: [0.56, 0.2, 1.0] },
  ],
};

export type CharacterGenerationResult =
  | {
      status: "complete";
      avatarModelUrl: string;
    }
  | {
      status: "failed";
      error: string;
    };
