"use client";

import { useEffect, useMemo, useState } from "react";

import type { MemoryArtifact } from "@/lib/memory-artifacts";

import { preloadArenaImages } from "./arena-assets";
import ArenaGame from "./arena-game";
import { MemoryFlash } from "./memory-flash";
import { ARENA_MATCH_CONFIG, type ArenaItem, type ArenaPlayer } from "./arena-types";
import { useRoomArenaMatch } from "./use-room-arena-match";

type ArenaMatchProps = {
  characterImageUrl?: string;
  items: MemoryArtifact[];
  roomCode: string;
  viewer: { id: string; name: string };
};

function remainingSeconds(endsAt: number | null, now: number) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1_000));
}

export default function ArenaMatch({ characterImageUrl, items, roomCode, viewer }: ArenaMatchProps) {
  const arenaItems = useMemo<ArenaItem[]>(() => items.map((item) => ({
    id: item.id,
    imageUrl: item.artifactImageUrl,
    memoryLabel: item.originalMemory,
    name: item.name,
  })), [items]);
  const [preloadStatus, setPreloadStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const player = useMemo<ArenaPlayer>(() => ({
    id: viewer.id,
    inventory: arenaItems,
    name: viewer.name,
    userId: viewer.id,
  }), [arenaItems, viewer.id, viewer.name]);
  const { attemptHit, error: matchError, state } = useRoomArenaMatch(
    roomCode,
    preloadStatus === "ready" && arenaItems.length > 0,
  );

  useEffect(() => {
    let cancelled = false;
    preloadArenaImages(arenaItems)
      .then(() => { if (!cancelled) setPreloadStatus("ready"); })
      .catch(() => { if (!cancelled) setPreloadStatus("failed"); });
    return () => { cancelled = true; };
  }, [arenaItems, preloadAttempt]);

  useEffect(() => {
    if (!state.phaseEndsAt) return;
    const timer = window.setInterval(() => setClock(Date.now()), 100);
    return () => window.clearInterval(timer);
  }, [state.phaseEndsAt]);

  const localItem = state.equipped[player.id];
  const opponent = state.players?.find((candidate) => candidate.id !== player.id);
  const flashOwner = state.players?.find((candidate) => candidate.id === state.eliminatedPlayerId);
  const flashItem = state.phase === "memory-flash" && state.eliminatedItem &&
    (ARENA_MATCH_CONFIG.flashAudience === "both" || state.eliminatedPlayerId === player.id)
    ? state.eliminatedItem
    : null;
  const winner = state.players?.find((candidate) => candidate.id === state.winnerId);
  const countdown = remainingSeconds(state.phaseEndsAt, clock);

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

  if (matchError && state.phase === "preloading" && preloadStatus === "ready") {
    return (
      <div className="arena-lobby-state" role="alert">
        <span className="arena-state-mark">!</span>
        <p>Arena unavailable</p>
        <h3>{matchError}</h3>
        <small>Close the arena and try joining the lobby again.</small>
      </div>
    );
  }

  if (preloadStatus === "loading" || state.phase === "preloading") {
    return (
      <div className="arena-lobby-state" role="status">
        <span className="arena-preload-spinner" />
        <p>Preparing your loadout</p>
        <h3>Loading {arenaItems.length} {arenaItems.length === 1 ? "memory" : "memories"}…</h3>
        <small>The match queue opens only when every image is ready.</small>
      </div>
    );
  }

  if (preloadStatus === "failed") {
    return (
      <div className="arena-lobby-state" role="alert">
        <span className="arena-state-mark">!</span>
        <p>Loadout interrupted</p>
        <h3>One of your memory images could not be loaded.</h3>
        <button onClick={() => {
          setPreloadStatus("loading");
          setPreloadAttempt((attempt) => attempt + 1);
        }} type="button">Retry preload</button>
      </div>
    );
  }

  if (state.phase === "waiting") {
    return (
      <div className="arena-lobby-state" role="status">
        <span className="arena-waiting-pulse" />
        <p>Loadout ready · {arenaItems.length} cached</p>
        <h3>Waiting for opponent</h3>
        <small>Anyone in scrapbook {roomCode} can enter the arena and join this lobby.</small>
      </div>
    );
  }

  if (state.phase === "countdown") {
    return (
      <div className="arena-countdown" role="status">
        <p>{viewer.name} <span>vs</span> {opponent?.name ?? "Opponent"}</p>
        <strong>{countdown || "GO"}</strong>
        <small>Round 1 · first to 3</small>
      </div>
    );
  }

  if (state.phase === "match-end") {
    const localWon = winner?.id === player.id;
    return (
      <div className={localWon ? "arena-results is-winner" : "arena-results"}>
        <span>{state.resultReason === "forfeit" ? "Match forfeited" : "Match complete"}</span>
        <h3>{winner?.name ?? "Unknown player"} wins</h3>
        <div className="arena-results-score">
          {state.players?.map((candidate) => (
            <div key={candidate.id}>
              <strong>{state.scores[candidate.id] ?? 0}</strong>
              <small>{candidate.id === player.id ? "You" : candidate.name}</small>
            </div>
          ))}
        </div>
        <p>{localWon ? "You carried the memory home." : "The memory lives on."}</p>
      </div>
    );
  }

  return (
    <div className="arena-match-shell">
      <ArenaGame active={state.phase === "round"} characterImageUrl={characterImageUrl} item={localItem} onOpponentHit={attemptHit} />
      <div className="arena-round-label"><small>ROUND</small><strong>{state.round}<span>/5</span></strong></div>
      <div className="arena-match-score">
        {state.players?.map((candidate, index) => (
          <div className={candidate.id === player.id ? "is-local" : ""} key={candidate.id}>
            <small>{candidate.id === player.id ? "YOU" : candidate.name}</small>
            <strong>{state.scores[candidate.id] ?? 0}</strong>
            {index === 0 ? <span>VS</span> : null}
          </div>
        ))}
      </div>
      {state.phase === "memory-flash" ? (
        <div className="arena-break-timer">Next round in {countdown}</div>
      ) : null}
      {matchError ? <div className="arena-sync-error" role="alert">{matchError}</div> : null}
      {flashItem && flashOwner ? <MemoryFlash item={flashItem} ownerName={flashOwner.name} /> : null}
    </div>
  );
}
