import * as Phaser from "phaser";
import { BattleState } from "@/engine/types";

export interface GameEvents {
  "battle:start-requested": { selectedItemIds: string[] };
  "battle:ready": { battleState: BattleState };
  "battle:ended": { status: BattleState["status"] };
}

class TypedEventBus extends Phaser.Events.EventEmitter {
  emitTyped<K extends keyof GameEvents>(event: K, payload: GameEvents[K]) {
    this.emit(event, payload);
  }

  onTyped<K extends keyof GameEvents>(
    event: K,
    callback: (payload: GameEvents[K]) => void,
  ) {
    this.on(event, callback);
  }

  offTyped<K extends keyof GameEvents>(
    event: K,
    callback: (payload: GameEvents[K]) => void,
  ) {
    this.off(event, callback);
  }
}

export const eventBus = new TypedEventBus();
