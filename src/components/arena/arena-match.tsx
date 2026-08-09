"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { MemoryArtifact } from "@/lib/memory-artifacts";
import type { ArenaPlayerSnapshot } from "@/lib/arena-realtime";
import type { ScrapbookMatchPage } from "@/lib/scrapbook-pages";

import { preloadArenaAssets } from "./arena-assets";
import ArenaGame from "./arena-game";
import { MemoryFlash } from "./memory-flash";
import type { ArenaItem } from "./arena-types";
import { useColyseusArena } from "./use-colyseus-arena";

type ArenaMatchProps = {
  characterImageUrl?: string;
  enabled?: boolean;
  items: MemoryArtifact[];
  onPageCreated?: (page: ScrapbookMatchPage) => void;
  onViewPage?: (pageNumber: number) => void;
  roomCode: string;
  viewer: { id: string; name: string };
};

function remainingSeconds(endsAt: number, now: number) {
  if (!endsAt) return 0;
  return Math.max(0, Math.ceil((endsAt - now) / 1_000));
}

function stateItem(item: ArenaPlayerSnapshot["item"]): ArenaItem {
  return {
    id: item.id,
    imageUrl: item.imageUrl || undefined,
    memoryLabel: item.memoryLabel,
    modelUrl: item.modelUrl || undefined,
    name: item.name,
    originalImageUrl: item.originalImageUrl || undefined,
  };
}

export default function ArenaMatch({
  enabled = true,
  items,
  onPageCreated,
  onViewPage,
  roomCode,
  viewer,
}: ArenaMatchProps) {
  const arenaItems = useMemo<ArenaItem[]>(() => items.flatMap((item) =>
    item.artifactModelUrl || item.artifactImageUrl
      ? [{
          id: item.id,
          modelUrl: item.artifactModelUrl,
          imageUrl: item.artifactImageUrl,
          memoryLabel: item.originalMemory,
          name: item.name,
          originalImageUrl: item.originalImageUrl,
        }]
      : [],
  ), [items]);
  const [preloadStatus, setPreloadStatus] = useState<"loading" | "ready" | "failed">("loading");
  const [preloadAttempt, setPreloadAttempt] = useState(0);
  const [clock, setClock] = useState(() => Date.now());
  const [savedPage, setSavedPage] = useState<ScrapbookMatchPage>();
  const [saveError, setSaveError] = useState<string>();
  const [saveAttempt, setSaveAttempt] = useState(0);
  const savingReceipt = useRef<string | undefined>(undefined);
  const realtime = useColyseusArena(
    roomCode,
    enabled && preloadStatus === "ready" && arenaItems.length > 0,
  );
  const impactOriginalImageUrl = realtime.snapshot?.impactItem.originalImageUrl;

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

  useEffect(() => {
    if (!impactOriginalImageUrl) return;
    const image = new Image();
    image.src = impactOriginalImageUrl;
  }, [impactOriginalImageUrl]);

  useEffect(() => {
    const receipt = realtime.snapshot?.resultReceipt;
    if (
      realtime.snapshot?.phase !== "match-end" ||
      !receipt ||
      savedPage?.matchId === realtime.snapshot.matchId ||
      savingReceipt.current === receipt
    ) {
      return;
    }

    let cancelled = false;
    savingReceipt.current = receipt;
    setSaveError(undefined);
    const savePage = async () => {
      const response = await fetch("/api/arena/results", {
        body: JSON.stringify({ receipt }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const result = await response.json() as { error?: string; page?: ScrapbookMatchPage };
      if (!response.ok || !result.page) {
        throw new Error(result.error || "Could not save the scrapbook page.");
      }
      if (!cancelled) {
        setSavedPage(result.page);
        onPageCreated?.(result.page);
      }
    };
    void savePage().catch((reason: unknown) => {
      if (!cancelled) {
        savingReceipt.current = undefined;
        setSaveError(reason instanceof Error ? reason.message : "Could not save the scrapbook page.");
      }
    });
    return () => { cancelled = true; };
  }, [onPageCreated, realtime.snapshot, saveAttempt, savedPage?.matchId]);

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
        {savedPage ? (
          <button
            className="arena-view-page"
            onClick={() => onViewPage?.(savedPage.pageNumber)}
            type="button"
          >
            View scrapbook page {savedPage.pageNumber}
          </button>
        ) : saveError ? (
          <button
            className="arena-view-page"
            onClick={() => {
              savingReceipt.current = undefined;
              setSaveError(undefined);
              setSaveAttempt((attempt) => attempt + 1);
            }}
            type="button"
          >
            Retry saving page
          </button>
        ) : (
          <small className="arena-saving-page" role="status">Binding a new scrapbook page…</small>
        )}
        {saveError ? <small className="arena-save-error" role="alert">{saveError}</small> : null}
      </div>
    );
  }

  const localItem = stateItem(localPlayer.item);
  const hittingItem = snapshot.impactItem.id
    ? stateItem(snapshot.impactItem)
    : undefined;
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
      {localWasHit && hittingItem ? (
        <MemoryFlash item={hittingItem} ownerName={opponent.name} />
      ) : null}
    </div>
  );
}
