"use client";

import { useEffect, useRef } from "react";
import type * as Phaser from "phaser";

export function GameCanvas() {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    let cancelled = false;

    (async () => {
      const [PhaserLib, { createGameConfig }] = await Promise.all([
        import("phaser"),
        import("@/game/config"),
      ]);

      if (cancelled || !containerRef.current) return;

      gameRef.current = new PhaserLib.Game(
        createGameConfig(containerRef.current),
      );
    })();

    return () => {
      cancelled = true;
      gameRef.current?.destroy(true);
      gameRef.current = null;
    };
  }, []);

  return <div ref={containerRef} />;
}
