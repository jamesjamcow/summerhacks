import * as Phaser from "phaser";
import { fallbackColorForKey } from "../assetKeys";

export class CharacterSprite extends Phaser.GameObjects.Container {
  private rect: Phaser.GameObjects.Rectangle;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    spriteKey: string,
    displayName: string,
  ) {
    super(scene, x, y);

    this.rect = scene.add.rectangle(0, 0, 96, 96, fallbackColorForKey(spriteKey));
    const label = scene.add
      .text(0, 60, displayName, { fontSize: "14px", color: "#ffffff" })
      .setOrigin(0.5, 0);

    this.add([this.rect, label]);
    scene.add.existing(this);
  }

  playHitFlash() {
    this.scene.tweens.add({
      targets: this.rect,
      alpha: 0.2,
      duration: 80,
      yoyo: true,
      repeat: 2,
    });
  }
}
