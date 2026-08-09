"use client";

import { useEffect, useMemo, useState } from "react";

import type { MemoryArtifact } from "@/lib/memory-artifacts";
import type { ArenaPlayerSnapshot } from "@/lib/arena-realtime";

import { preloadArenaAssets } from "./arena-assets";
import ArenaGame from "./arena-game";
import { MemoryFlash } from "./memory-flash";
import type { ArenaItem } from "./arena-types";
import { useColyseusArena } from "./use-colyseus-arena";

type ArenaMatchProps = {
  characterImageUrl?: string;
  items: MemoryArtifact[];
  roomCode: string;
  viewer: { id: string; name: string };
};

function remainingSeconds(endsAt: number, now: number) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1_000));
}

function playerItem(player: ArenaPlayerSnapshot): ArenaItem {
  return {
    id: player.item.id,
    imageUrl: player.item.imageUrl || undefined,
    memoryLabel: player.item.memoryLabel,
    modelUrl: player.item.modelUrl || undefined,
    name: player.item.name,
  };
}

export default function ArenaMatch({ items, roomCode, viewer }: ArenaMatchProps) {
  const arenaItems = useMemo<ArenaItem[]>(() => items.flatMap((item) =>
    item.artifactModelUrl || item.artifactImageUrl
      ? [{
          id: item.id,
          modelUrl: item.artifactModelUrl,
          imageUrl: item.artifactImageUrl,
          memoryLabel: item.originalMemory,
          name: item.name,
        }]
      : [],
  ), [items]);
  const [preloadStatus, setPreloadStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const realtime = useColyseusArena(
    roomCode,
    preloadStatus === "ready" && arenaItems.length > 0,
  );

  useEffect(() => {
    let cancelled = false;
    preloadArenaAssets(arenaItems)
      .then(() => { if (!cancelled) setPreloadStatus("ready"); })
      .catch(() => { if (!cancelled) setPreloadStatus("failed"); });
    return () => { cancelled = true; };
  }, [arenaItems, preloadAttempt]);

  useEffect(() => {
    if (!realtime.snapshot?.phaseEndsAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [realtime.snapshot?.phaseEndsAt]);

  if (!arenaItems.length) {
    return (
      <div className="arena-lobby-state">
        <span className="arena-state-mark">◇</span>
        <p>Inventory required</p>
        <h3>Bring at least one memory into the arena.</h3>
        <small>Close the arena and add a keepsake to your scrapbook first.</small>
      </div>
    );
  }

  if (preloadStatus === "loading") {
    return (
      <div className="arena-lobby-state" role="status">
        <span className="arena-preload-spinner" />
        <p>Preparing your loadout</p>
        <h3>Loading {arenaItems.length} {arenaItems.length === 1 ? "memory" : "memories"}…</h3>
        <small>The realtime room opens when your keepsakes are ready.</small>
      </div>
    );
  }

  if (preloadStatus === "failed") {
    return (
      <div className="arena-lobby-state" role="alert">
        <span className="arena-state-mark">!</span>
        <p>Loadout interrupted</p>
        <h3>One of your memory keepsakes could not be loaded.</h3>
        <button onClick={() => {
          setPreloadStatus("loading");
          setPreloadAttempt((attempt) => attempt + 1);
        }} type="button">Retry preload</button>
      </div>
    );
  }

  if (realtime.error && !realtime.snapshot) {
    return (
      <div className="arena-lobby-state" role="alert">
        <span className="arena-state-mark">!</span>
        <p>Realtime arena unavailable</p>
        <h3>{realtime.error}</h3>
        <small>Make sure the Colyseus arena service is running, then reopen this arena.</small>
      </div>
    );
  }

  if (!realtime.snapshot || realtime.status === "connecting") {
    return (
      <div className="arena-lobby-state" role="status">
        <span className="arena-preload-spinner" />
        <p>Joining realtime arena</p>
        <h3>Connecting to Colyseus…</h3>
        <small>Your signed room ticket is valid for this scrapbook only.</small>
      </div>
    );
  }

  const snapshot = realtime.snapshot;
  const players = Object.values(snapshot.players);
  const localPlayer = snapshot.players[viewer.id];
  const opponent = players.find((player) => player.userId !== viewer.id);
  const countdown = remainingSeconds(snapshot.phaseEndsAt, clock);

  if (!localPlayer) {
    return (
      <div className="arena-lobby-state" role="status">
        <span className="arena-preload-spinner" />
        <p>Claiming your spawn</p>
        <h3>Entering the shared map…</h3>
      </div>
    );
  }

  if (snapshot.phase === "waiting" || !opponent) {
    return (
      <div className="arena-lobby-state" role="status">
        <span className="arena-waiting-pulse" />
        <p>Colyseus connected · {arenaItems.length} cached</p>
        <h3>Waiting for opponent</h3>
        <small>Another member of scrapbook {roomCode} can enter this same live map.</small>
      </div>
    );
  }

  if (snapshot.phase === "countdown") {
    return (
      <div className="arena-countdown" role="status">
        <p>{viewer.name} <span>vs</span> {opponent.name}</p>
        <strong>{countdown || "GO"}</strong>
        <small>Round {snapshot.round} · first to 3</small>
      </div>
    );
  }

  if (snapshot.phase === "match-end") {
    const winner = snapshot.players[snapshot.winnerId];
    const localWon = winner?.userId === viewer.id;
    return (
      <div className={localWon ? "arena-results is-winner" : "arena-results"}>
        <span>{snapshot.resultReason === "forfeit" ? "Match forfeited" : "Match complete"}</span>
        <h3>{winner?.name || "Unknown player"} wins</h3>
        <div className="arena-results-score">
          {players.map((player) => (
            <div key={player.userId}>
              <strong>{player.score}</strong>
              <small>{player.userId === viewer.id ? "You" : player.name}</small>
            </div>
          ))}
        </div>
        <p>{localWon ? "You carried the memory home." : "The memory lives on."}</p>
      </div>
    );
  }

  const eliminated = snapshot.players[snapshot.eliminatedPlayerId];
  const localItem = playerItem(localPlayer);
  const eliminatedItem = eliminated ? playerItem(eliminated) : undefined;
  const localWasHit = snapshot.phase === "round-over" && snapshot.eliminatedPlayerId === viewer.id;

  return (
    <div className="arena-match-shell">
      <ArenaGame
        active={snapshot.phase === "playing"}
        item={localItem}
        localPlayer={localPlayer}
        onInput={realtime.sendInput}
        onShoot={realtime.shoot}
        players={snapshot.players}
        projectiles={snapshot.projectiles}
      />
      <div className="arena-round-label"><small>ROUND</small><strong>{snapshot.round}<span>/5</span></strong></div>
      <div className="arena-match-score">
        {players.map((player, index) => (
          <div className={player.userId === viewer.id ? "is-local" : ""} key={player.userId}>
            <small>{player.userId === viewer.id ? "YOU" : player.name}</small>
            <strong>{player.score}</strong>
            {index === 0 ? <span>VS</span> : null}
          </div>
        ))}
      </div>
      {snapshot.phase === "round-over" ? (
        <div className="arena-break-timer">Next round in {countdown}</div>
      ) : null}
      {realtime.status === "reconnecting" ? (
        <div className="arena-sync-error" role="status">Reconnecting to Colyseus…</div>
      ) : null}
      {realtime.error ? <div className="arena-sync-error" role="alert">{realtime.error}</div> : null}
      {localWasHit && eliminatedItem ? (
        <MemoryFlash item={eliminatedItem} ownerName={eliminated?.name || viewer.name} />
      ) : null}
    </div>
  );
}
