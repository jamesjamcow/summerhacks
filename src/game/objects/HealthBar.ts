import * as Phaser from "phaser";

export class HealthBar extends Phaser.GameObjects.Container {
  private barWidth: number;
  private barHeight: number;
  private background: Phaser.GameObjects.Rectangle;
  private fill: Phaser.GameObjects.Rectangle;
  private label: Phaser.GameObjects.Text;
  private maxHealth: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    maxHealth: number,
    name: string,
  ) {
    super(scene, x, y);
    this.barWidth = width;
    this.barHeight = height;
    this.maxHealth = maxHealth;

    this.background = scene.add.rectangle(0, 0, width, height, 0x222222).setOrigin(0, 0);
    this.fill = scene.add
      .rectangle(0, 0, width, height, 0x3ddc84)
      .setOrigin(0, 0);
    this.label = scene.add.text(0, -18, `${name}  ${maxHealth}/${maxHealth}`, {
      fontSize: "14px",
      color: "#ffffff",
    });

    this.add([this.background, this.fill, this.label]);
    scene.add.existing(this);
  }

  setHealth(currentHealth: number, name: string) {
    const ratio = Phaser.Math.Clamp(currentHealth / this.maxHealth, 0, 1);
    this.fill.width = this.barWidth * ratio;
    this.fill.fillColor = ratio > 0.3 ? 0x3ddc84 : 0xdc3d3d;
    this.label.setText(`${name}  ${Math.max(0, currentHealth)}/${this.maxHealth}`);
  }
}
