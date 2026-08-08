import * as Phaser from "phaser";
import { BattleEvent, BattleState, Character, Item, ParticipantSlot } from "@/engine/types";
import { submitAction } from "@/engine/localBattleClient";
import { ARENA_BACKGROUND_KEY } from "../assetKeys";
import { formatAbilitySummary } from "../abilityDisplay";
import { HealthBar } from "../objects/HealthBar";
import { CharacterSprite } from "../objects/CharacterSprite";
import { eventBus } from "../eventBus";

interface ArenaSceneData {
  battleState: BattleState;
  playerCharacter: Character;
  opponentCharacter: Character;
}

const STATUS_LABELS: Record<string, string> = {
  poison: "Poison",
  buff: "Buffed",
  debuff: "Debuffed",
  shield: "Shield",
  stun: "Stunned",
};

export class ArenaScene extends Phaser.Scene {
  private battleState!: BattleState;
  private playerCharacter!: Character;
  private opponentCharacter!: Character;

  private playerSprite?: CharacterSprite;
  private opponentSprite?: CharacterSprite;
  private playerHealthBar?: HealthBar;
  private opponentHealthBar?: HealthBar;
  private playerStatusText?: Phaser.GameObjects.Text;
  private opponentStatusText?: Phaser.GameObjects.Text;
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

    this.playerStatusText = this.add.text(120, 145, "", {
      fontSize: "12px",
      color: "#ffe066",
    });
    this.opponentStatusText = this.add.text(620, 145, "", {
      fontSize: "12px",
      color: "#ffe066",
    });

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

  private isStunned(slot: ParticipantSlot): boolean {
    return this.battleState.participants[slot].statusEffects.some(
      (effect) => effect.kind === "stun",
    );
  }

  private formatStatusEffects(slot: ParticipantSlot): string {
    return this.battleState.participants[slot].statusEffects
      .map((effect) => `${STATUS_LABELS[effect.kind] ?? effect.kind} (${effect.remainingTurns})`)
      .join(", ");
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
    this.playerStatusText?.setText(this.formatStatusEffects("player"));
    this.opponentStatusText?.setText(this.formatStatusEffects("opponent"));
  }

  private renderActionBar() {
    this.actionButtons.forEach((btn) => btn.destroy());
    this.actionButtons = [];

    const isPlayerTurn =
      this.battleState.activeSlot === "player" &&
      this.battleState.status === "in_progress";

    if (isPlayerTurn && this.isStunned("player")) {
      const skipButton = this.add
        .text(30, 460, "Skip Turn (Stunned)", {
          fontSize: "16px",
          color: "#ffffff",
          backgroundColor: "#6a3a3a",
          padding: { x: 12, y: 8 },
        })
        .setInteractive({ useHandCursor: !this.busy })
        .on("pointerdown", () => this.onPlayerSkipTurn());
      this.actionButtons.push(skipButton);
      return;
    }

    const items = this.battleState.participants.player.selectedItemIds
      .map((id) => this.getItem(this.playerCharacter, id))
      .filter((item): item is Item => Boolean(item));

    items.forEach((item, index) => {
      const cooldown =
        this.battleState.participants.player.cooldowns[item.id] ?? 0;
      const disabled = !isPlayerTurn || cooldown > 0 || this.busy;
      const summary = formatAbilitySummary(item.ability);
      const label = cooldown > 0 ? `${item.name} (CD ${cooldown})` : `${item.name} — ${summary}`;

      const button = this.add
        .text(30 + index * 180, 460, label, {
          fontSize: "14px",
          color: disabled ? "#666666" : "#ffffff",
          backgroundColor: disabled ? "#222222" : "#3a3a6a",
          padding: { x: 12, y: 8 },
          wordWrap: { width: 170 },
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

  private async onPlayerSkipTurn() {
    if (this.busy) return;
    this.busy = true;
    this.renderActionBar();

    const { state, events } = await submitAction(
      this.battleState,
      { type: "SKIP_TURN", actorSlot: "player" },
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
    const stunned = this.isStunned("opponent");
    const usableItemId = stunned
      ? undefined
      : opponent.selectedItemIds.find((id) => (opponent.cooldowns[id] ?? 0) <= 0);

    const action = usableItemId
      ? { type: "USE_ITEM" as const, actorSlot: "opponent" as const, itemId: usableItemId }
      : { type: "SKIP_TURN" as const, actorSlot: "opponent" as const };

    const { state, events } = await submitAction(this.battleState, action, {
      playerCharacter: this.playerCharacter,
      opponentCharacter: this.opponentCharacter,
    });

    this.battleState = state;
    this.applyEvents(events, "opponent");
    this.refreshHealthBars();
    this.renderActionBar();

    if (this.battleState.status !== "in_progress") {
      this.endBattle();
    }
  }

  private applyEvents(events: BattleEvent[], actor: ParticipantSlot) {
    const actorName =
      actor === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName;

    for (const event of events) {
      switch (event.type) {
        case "DAMAGE_DEALT": {
          const payload = event.payload as {
            damageDealt: number;
            targetSlot: ParticipantSlot;
          };
          const targetSprite =
            payload.targetSlot === "player" ? this.playerSprite : this.opponentSprite;
          targetSprite?.playHitFlash();
          if (payload.damageDealt > 0) {
            this.appendLog(`${actorName} dealt ${payload.damageDealt} damage.`);
          }
          break;
        }
        case "SHIELD_ABSORBED": {
          const payload = event.payload as { absorbed: number; targetSlot: ParticipantSlot };
          const name =
            payload.targetSlot === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName;
          this.appendLog(`${name}'s shield absorbed ${payload.absorbed} damage.`);
          break;
        }
        case "POISON_TICK": {
          const payload = event.payload as { slot: ParticipantSlot; damage: number };
          const name =
            payload.slot === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName;
          const sprite = payload.slot === "player" ? this.playerSprite : this.opponentSprite;
          sprite?.playHitFlash();
          this.appendLog(`${name} takes ${payload.damage} poison damage.`);
          break;
        }
        case "POISON_APPLIED": {
          const payload = event.payload as { targetSlot: ParticipantSlot };
          const name =
            payload.targetSlot === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName;
          this.appendLog(`${name} is poisoned.`);
          break;
        }
        case "BUFF_APPLIED":
          this.appendLog(`${actorName} is buffed.`);
          break;
        case "DEBUFF_APPLIED": {
          const payload = event.payload as { slot: ParticipantSlot };
          const name =
            payload.slot === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName;
          this.appendLog(`${name} is debuffed.`);
          break;
        }
        case "HEAL_APPLIED": {
          const payload = event.payload as { healedAmount: number };
          this.appendLog(`${actorName} heals ${payload.healedAmount} HP.`);
          break;
        }
        case "SHIELD_APPLIED":
          this.appendLog(`${actorName} raises a shield.`);
          break;
        case "STUN_APPLIED": {
          const payload = event.payload as { slot: ParticipantSlot };
          const name =
            payload.slot === "player" ? this.playerCharacter.displayName : this.opponentCharacter.displayName;
          this.appendLog(`${name} is stunned!`);
          break;
        }
        case "TURN_SKIPPED":
          this.appendLog(`${actorName} skips their turn.`);
          break;
        case "INVALID_ACTION":
          this.appendLog("Action rejected by battle engine.");
          break;
        default:
          break;
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
