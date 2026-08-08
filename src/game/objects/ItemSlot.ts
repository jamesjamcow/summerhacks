import * as Phaser from "phaser";
import { Item } from "@/engine/types";
import { fallbackColorForKey } from "../assetKeys";
import { categoryColorHex, formatAbilitySummary } from "../abilityDisplay";

export class ItemSlot extends Phaser.GameObjects.Container {
  readonly item: Item;
  private box: Phaser.GameObjects.Rectangle;
  private selected = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    item: Item,
    onToggle: (item: Item, selected: boolean) => void,
  ) {
    super(scene, x, y);
    this.item = item;

    this.box = scene.add
      .rectangle(0, 0, 100, 100, fallbackColorForKey(item.spriteKey))
      .setStrokeStyle(3, 0xffffff, 0)
      .setInteractive({ useHandCursor: true });

    const nameLabel = scene.add
      .text(0, 40, item.name, { fontSize: "12px", color: "#ffffff", align: "center" })
      .setOrigin(0.5, 0)
      .setWordWrapWidth(100);

    const categoryLabel = scene.add
      .text(0, -34, item.ability.category.toUpperCase(), {
        fontSize: "10px",
        color: categoryColorHex(item.ability.category),
      })
      .setOrigin(0.5, 0.5);

    const summaryLabel = scene.add
      .text(0, -10, formatAbilitySummary(item.ability), {
        fontSize: "13px",
        color: "#ffffff",
        align: "center",
      })
      .setOrigin(0.5, 0.5)
      .setWordWrapWidth(96);

    this.add([this.box, categoryLabel, nameLabel, summaryLabel]);
    scene.add.existing(this);

    this.box.on("pointerdown", () => {
      this.selected = !this.selected;
      this.box.setStrokeStyle(3, 0xffe066, this.selected ? 1 : 0);
      onToggle(item, this.selected);
    });
  }

  setEnabled(enabled: boolean) {
    this.box.setAlpha(enabled ? 1 : 0.4);
    if (enabled) {
      this.box.setInteractive({ useHandCursor: true });
    } else {
      this.box.disableInteractive();
    }
  }

  setSelected(selected: boolean) {
    this.selected = selected;
    this.box.setStrokeStyle(3, 0xffe066, selected ? 1 : 0);
  }
}
