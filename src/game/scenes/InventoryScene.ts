import * as Phaser from "phaser";
import { Character, Item } from "@/engine/types";
import { MAX_ITEMS_PER_BATTLE } from "@/engine/rules";
import { startBattle } from "@/engine/localBattleClient";
import { fetchCharacter } from "@/data/fetchItems";
import { mockCpuCharacter, mockPlayerCharacter } from "@/data/mockCharacters";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { ItemSlot } from "../objects/ItemSlot";
import { eventBus } from "../eventBus";

const ITEM_START_X = 100;
const ITEM_START_Y = 190;
const ITEM_SPACING_X = 140;

export class InventoryScene extends Phaser.Scene {
  private character: Character | null = null;
  private selectedItemIds: Set<string> = new Set();
  private searchQuery = "";
  private itemSlots: ItemSlot[] = [];
  private enterButton?: Phaser.GameObjects.Text;
  private statusText?: Phaser.GameObjects.Text;
  private noResultsText?: Phaser.GameObjects.Text;

  constructor() {
    super("InventoryScene");
  }

  create() {
    this.selectedItemIds = new Set();
    this.searchQuery = "";
    this.itemSlots = [];

    this.add
      .text(30, 24, "Your Character", { fontSize: "24px", color: "#ffffff" })
      .setOrigin(0, 0);

    this.statusText = this.add
      .text(30, 56, "Loading inventory...", {
        fontSize: "14px",
        color: "#aaaaaa",
      })
      .setOrigin(0, 0);

    this.createSearchBox();

    this.noResultsText = this.add
      .text(ITEM_START_X, ITEM_START_Y, "No items match your search.", {
        fontSize: "14px",
        color: "#888888",
      })
      .setOrigin(0, 0)
      .setVisible(false);

    this.loadCharacter();
  }

  private createSearchBox() {
    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Search items...";
    input.style.width = "220px";
    input.style.padding = "6px 10px";
    input.style.fontSize = "14px";
    input.style.borderRadius = "4px";
    input.style.border = "1px solid #555";
    input.style.background = "#1a1a1a";
    input.style.color = "#ffffff";
    input.addEventListener("input", () => {
      this.searchQuery = input.value;
      this.renderFilteredItemSlots();
    });

    this.add.dom(ITEM_START_X, 100, input).setOrigin(0, 0.5);
  }

  private async loadCharacter() {
    try {
      this.character = await fetchCharacter(mockPlayerCharacter.id);
    } catch {
      this.character = mockPlayerCharacter;
    }
    this.statusText?.setText(
      `Select up to ${MAX_ITEMS_PER_BATTLE} items, then enter the arena.`,
    );
    this.renderFilteredItemSlots();
    this.createEnterButton();
  }

  private getFilteredItems(): Item[] {
    if (!this.character) return [];
    const items = this.character.inventory.items;

    if (this.searchQuery.trim().length === 0) {
      return items;
    }

    return fuzzySearch(
      items,
      this.searchQuery,
      (item) => `${item.name} ${item.ability.useCase}`,
    ).map((match) => match.item);
  }

  private renderFilteredItemSlots() {
    this.itemSlots.forEach((slot) => slot.destroy());
    this.itemSlots = [];

    const items = this.getFilteredItems();
    this.noResultsText?.setVisible(items.length === 0);

    items.forEach((item, index) => {
      const slot = new ItemSlot(
        this,
        ITEM_START_X + index * ITEM_SPACING_X,
        ITEM_START_Y,
        item,
        (item: Item, selected: boolean) => this.onItemToggled(item, selected),
      );
      slot.setSelected(this.selectedItemIds.has(item.id));
      this.itemSlots.push(slot);
    });
  }

  private createEnterButton() {
    if (this.enterButton) return;

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
