import * as Phaser from "phaser";
import { BattleState, Character, Item } from "@/engine/types";
import { submitAction } from "@/engine/localBattleClient";
import { ARENA_BACKGROUND_KEY } from "../assetKeys";
import { HealthBar } from "../objects/HealthBar";
import { CharacterSprite } from "../objects/CharacterSprite";
import { eventBus } from "../eventBus";

interface ArenaSceneData {
  battleState: BattleState;
  playerCharacter: Character;
  opponentCharacter: Character;
}

export class ArenaScene extends Phaser.Scene {
  private battleState!: BattleState;
  private playerCharacter!: Character;
  private opponentCharacter!: Character;

  private playerSprite?: CharacterSprite;
  private opponentSprite?: CharacterSprite;
  private playerHealthBar?: HealthBar;
  private opponentHealthBar?: HealthBar;
  private actionButtons: Phaser.GameObjects.Text[] = [];
  private logText?: Phaser.GameObjects.Text;
  private overlay?: Phaser.GameObjects.Container;
  private busy = false;

  constructor() {
    super("ArenaScene");
  }

  init(data: ArenaSceneData) {
    this.battleState = data.battleState;
    this.playerCharacter = data.playerCharacter;
    this.opponentCharacter = data.opponentCharacter;
    this.actionButtons = [];
    this.overlay = undefined;
    this.busy = false;
  }

  create() {
    this.add.image(480, 300, ARENA_BACKGROUND_KEY);

    this.playerSprite = new CharacterSprite(
      this,
      220,
      260,
      "character_player",
      this.playerCharacter.displayName,
    );
    this.opponentSprite = new CharacterSprite(
      this,
      740,
      260,
      "character_opponent",
      this.opponentCharacter.displayName,
    );

    this.playerHealthBar = new HealthBar(
      this,
      120,
      120,
      220,
      18,
      this.battleState.participants.player.maxHealth,
      this.playerCharacter.displayName,
    );
    this.opponentHealthBar = new HealthBar(
      this,
      620,
      120,
      220,
      18,
      this.battleState.participants.opponent.maxHealth,
      this.opponentCharacter.displayName,
    );

    this.refreshHealthBars();

    this.logText = this.add.text(30, 400, "", {
      fontSize: "14px",
      color: "#cccccc",
      wordWrap: { width: 900 },
    });

    this.renderActionBar();
  }

  private getItem(character: Character, itemId: string): Item | undefined {
    return character.inventory.items.find((item) => item.id === itemId);
  }

  private refreshHealthBars() {
    this.playerHealthBar?.setHealth(
      this.battleState.participants.player.currentHealth,
      this.playerCharacter.displayName,
    );
    this.opponentHealthBar?.setHealth(
      this.battleState.participants.opponent.currentHealth,
      this.opponentCharacter.displayName,
    );
  }

  private renderActionBar() {
    this.actionButtons.forEach((btn) => btn.destroy());
    this.actionButtons = [];

    const items = this.battleState.participants.player.selectedItemIds
      .map((id) => this.getItem(this.playerCharacter, id))
      .filter((item): item is Item => Boolean(item));

    const isPlayerTurn =
      this.battleState.activeSlot === "player" &&
      this.battleState.status === "in_progress";

    items.forEach((item, index) => {
      const cooldown =
        this.battleState.participants.player.cooldowns[item.id] ?? 0;
      const disabled = !isPlayerTurn || cooldown > 0 || this.busy;
      const label = cooldown > 0 ? `${item.name} (CD ${cooldown})` : item.name;

      const button = this.add
        .text(30 + index * 180, 460, label, {
          fontSize: "16px",
          color: disabled ? "#666666" : "#ffffff",
          backgroundColor: disabled ? "#222222" : "#3a3a6a",
          padding: { x: 12, y: 8 },
        })
        .setInteractive({ useHandCursor: !disabled });

      if (!disabled) {
        button.on("pointerdown", () => this.onPlayerUseItem(item.id));
      }

      this.actionButtons.push(button);
    });
  }

  private appendLog(line: string) {
    const current = this.logText?.text ?? "";
    const next = `${current}\n${line}`.trim();
    this.logText?.setText(next);
  }

  private async onPlayerUseItem(itemId: string) {
    if (this.busy) return;
    this.busy = true;
    this.renderActionBar();

    const { state, events } = await submitAction(
      this.battleState,
      { type: "USE_ITEM", actorSlot: "player", itemId },
      {
        playerCharacter: this.playerCharacter,
        opponentCharacter: this.opponentCharacter,
      },
    );

    this.battleState = state;
    this.applyEvents(events, "player");
    this.refreshHealthBars();

    if (this.battleState.status !== "in_progress") {
      this.busy = false;
      this.renderActionBar();
      this.endBattle();
      return;
    }

    this.busy = false;
    this.renderActionBar();
    this.time.delayedCall(700, () => this.maybeRunCpuTurn());
  }

  private async maybeRunCpuTurn() {
    if (
      this.battleState.status !== "in_progress" ||
      this.battleState.activeSlot !== "opponent"
    ) {
      return;
    }

    const opponent = this.battleState.participants.opponent;
    const usableItemId = opponent.selectedItemIds.find(
      (id) => (opponent.cooldowns[id] ?? 0) <= 0,
    );

    if (!usableItemId) {
      const { state, events } = await submitAction(
        this.battleState,
        { type: "FORFEIT", actorSlot: "opponent" },
        {
          playerCharacter: this.playerCharacter,
          opponentCharacter: this.opponentCharacter,
        },
      );
      this.battleState = state;
      this.applyEvents(events, "opponent");
      this.refreshHealthBars();
      this.endBattle();
      return;
    }

    const { state, events } = await submitAction(
      this.battleState,
      { type: "USE_ITEM", actorSlot: "opponent", itemId: usableItemId },
      {
        playerCharacter: this.playerCharacter,
        opponentCharacter: this.opponentCharacter,
      },
    );

    this.battleState = state;
    this.applyEvents(events, "opponent");
    this.refreshHealthBars();
    this.renderActionBar();

    if (this.battleState.status !== "in_progress") {
      this.endBattle();
    }
  }

  private applyEvents(
    events: { type: string; payload: unknown }[],
    actor: "player" | "opponent",
  ) {
    for (const event of events) {
      if (event.type === "DAMAGE_DEALT") {
        const payload = event.payload as {
          itemId: string;
          damageDealt: number;
          targetSlot: "player" | "opponent";
        };
        const targetSprite =
          payload.targetSlot === "player" ? this.playerSprite : this.opponentSprite;
        targetSprite?.playHitFlash();
        this.appendLog(
          `${actor === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName} dealt ${payload.damageDealt} damage.`,
        );
      }
      if (event.type === "INVALID_ACTION") {
        this.appendLog("Action rejected by battle engine.");
      }
    }
  }

  private endBattle() {
    const status = this.battleState.status;
    eventBus.emitTyped("battle:ended", { status });

    const message =
      status === "won"
        ? "You won!"
        : status === "lost"
          ? "You lost."
          : "Draw.";

    this.overlay = this.add.container(0, 0);
    const bg = this.add.rectangle(480, 300, 960, 600, 0x000000, 0.6);
    const text = this.add
      .text(480, 260, message, { fontSize: "32px", color: "#ffffff" })
      .setOrigin(0.5);
    const button = this.add
      .text(480, 340, "Return to Inventory", {
        fontSize: "18px",
        color: "#ffffff",
        backgroundColor: "#2d6a4f",
        padding: { x: 16, y: 10 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.scene.start("InventoryScene"));

    this.overlay.add([bg, text, button]);
  }
}
