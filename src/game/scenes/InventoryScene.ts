import * as Phaser from "phaser";
import { Character, Item } from "@/engine/types";
import { MAX_ITEMS_PER_BATTLE } from "@/engine/rules";
import { startBattle } from "@/engine/localBattleClient";
import { fetchCharacter } from "@/data/fetchItems";
import { mockCpuCharacter, mockPlayerCharacter } from "@/data/mockCharacters";
import { ItemSlot } from "../objects/ItemSlot";
import { eventBus } from "../eventBus";

export class InventoryScene extends Phaser.Scene {
  private character: Character | null = null;
  private selectedItemIds: Set<string> = new Set();
  private enterButton?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;

  constructor() {
    super("InventoryScene");
  }

  create() {
    this.selectedItemIds = new Set();
    this.add
      .text(30, 24, "Your Character", { fontSize: "24px", color: "#ffffff" })
      .setOrigin(0, 0);

    this.statusText = this.add
      .text(30, 56, "Loading inventory...", {
        fontSize: "14px",
        color: "#aaaaaa",
      })
      .setOrigin(0, 0);

    this.loadCharacter();
  }

  private async loadCharacter() {
    try {
      this.character = await fetchCharacter(mockPlayerCharacter.id);
    } catch {
      this.character = mockPlayerCharacter;
    }
    this.renderInventory();
  }

  private renderInventory() {
    if (!this.character) return;
    this.statusText?.setText(
      `Select up to ${MAX_ITEMS_PER_BATTLE} items, then enter the arena.`,
    );

    const items = this.character.inventory.items;
    const startX = 100;
    const startY = 160;
    const spacingX = 140;

    items.forEach((item, index) => {
      new ItemSlot(
        this,
        startX + index * spacingX,
        startY,
        item,
        (item: Item, selected: boolean) => this.onItemToggled(item, selected),
      );
    });

    this.enterButton = this.add
      .text(30, 500, "Enter Arena", {
        fontSize: "20px",
        color: "#ffffff",
        backgroundColor: "#2d6a4f",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0, 0)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.onEnterArena());

    this.updateEnterButtonState();
  }

  private onItemToggled(item: Item, selected: boolean) {
    if (selected) {
      if (this.selectedItemIds.size >= MAX_ITEMS_PER_BATTLE) {
        return;
      }
      this.selectedItemIds.add(item.id);
    } else {
      this.selectedItemIds.delete(item.id);
    }
    this.updateEnterButtonState();
  }

  private updateEnterButtonState() {
    const ready = this.selectedItemIds.size > 0;
    this.enterButton?.setAlpha(ready ? 1 : 0.5);
  }

  private async onEnterArena() {
    if (!this.character || this.selectedItemIds.size === 0) return;

    const selectedItemIds = Array.from(this.selectedItemIds);
    eventBus.emitTyped("battle:start-requested", { selectedItemIds });

    const opponentItemIds = mockCpuCharacter.inventory.items.map((i) => i.id);
    const battleState = await startBattle(
      `battle-${Date.now()}`,
      this.character,
      mockCpuCharacter,
      { player: selectedItemIds, opponent: opponentItemIds },
    );

    eventBus.emitTyped("battle:ready", { battleState });

    this.scene.start("ArenaScene", {
      battleState,
      playerCharacter: this.character,
      opponentCharacter: mockCpuCharacter,
    });
  }
}
