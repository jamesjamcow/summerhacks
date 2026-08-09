export type TripPortrait = {
  createdAt: string;
  imageUrl: string;
  loserName: string;
  matchId: string;
  photoCount: number;
  photoLabels: string[];
  roomCode: string;
  version: 1;
  winnerName: string;
};

function shortText(value: unknown, maximum: number) {
  return typeof value === "string" && value.length > 0 && value.length <= maximum;
}

export function parseTripPortrait(value: unknown): TripPortrait | undefined {
  if (!value || typeof value !== "object") return undefined;
  const portrait = value as Record<string, unknown>;
  if (
    portrait.version !== 1 ||
    !shortText(portrait.matchId, 64) ||
    !shortText(portrait.roomCode, 8) ||
    !shortText(portrait.imageUrl, 2_048) ||
    !shortText(portrait.createdAt, 64) ||
    !shortText(portrait.winnerName, 100) ||
    !shortText(portrait.loserName, 100) ||
    typeof portrait.photoCount !== "number" ||
    !Number.isSafeInteger(portrait.photoCount) ||
    portrait.photoCount < 1 ||
    portrait.photoCount > 14 ||
    !Array.isArray(portrait.photoLabels) ||
    portrait.photoLabels.length !== portrait.photoCount ||
    !portrait.photoLabels.every((label) => shortText(label, 160))
  ) {
    return undefined;
  }

  try {
    const imageUrl = new URL(portrait.imageUrl as string);
    if (imageUrl.protocol !== "https:") return undefined;
  } catch {
    return undefined;
  }

  return portrait as TripPortrait;
}

export function tripPortraitStorageKey(userId: string) {
  return `summerhacks:trip-portrait:v1:${encodeURIComponent(userId)}`;
}
