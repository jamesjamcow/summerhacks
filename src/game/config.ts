import * as Phaser from "phaser";
import { BootScene } from "./scenes/BootScene";
import { InventoryScene } from "./scenes/InventoryScene";
import { ArenaScene } from "./scenes/ArenaScene";

export function createGameConfig(
  parent: HTMLElement,
): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 960,
    height: 600,
    parent,
    backgroundColor: "#111111",
    scene: [BootScene, InventoryScene, ArenaScene],
  };
}
