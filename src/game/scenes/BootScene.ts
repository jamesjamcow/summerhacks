import * as Phaser from "phaser";
import { ARENA_BACKGROUND_KEY } from "../assetKeys";

export class BootScene extends Phaser.Scene {
  constructor() {
    super("BootScene");
  }

  create() {
    const width = 960;
    const height = 600;
    const graphics = this.add.graphics();
    graphics.fillGradientStyle(0x1b2a4a, 0x1b2a4a, 0x0d1424, 0x0d1424, 1);
    graphics.fillRect(0, 0, width, height);
    graphics.generateTexture(ARENA_BACKGROUND_KEY, width, height);
    graphics.destroy();

    this.scene.start("InventoryScene");
  }
}
