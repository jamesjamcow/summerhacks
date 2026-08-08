import * as Phaser from "phaser";

export const ARENA_BACKGROUND_KEY = "arena_bg_universal";
export const PLAYER_SPRITE_KEY = "character_player";
export const OPPONENT_SPRITE_KEY = "character_opponent";

function hashStringToHue(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % 360;
}

export function resolveSpriteKey(key: string): string {
  return key;
}

export function fallbackColorForKey(key: string): number {
  const hue = hashStringToHue(key);
  return Phaser.Display.Color.HSLToColor(hue / 360, 0.55, 0.5).color;
}
