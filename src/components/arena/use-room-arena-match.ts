"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createInitialArenaState } from "./match-machine";
import type { ArenaMatchState } from "./arena-types";

type MatchResponse = {
  error?: string;
  matchId: string;
  state: ArenaMatchState;
  status: string;
};

async function arenaRequest(body: Record<string, unknown>) {
  const response = await fetch("/api/arena", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
  const result = await response.json() as MatchResponse;
  if (!response.ok) throw new Error(result.error || "Arena request failed");
  return result;
}

export function useRoomArenaMatch(roomCode: string, preloadComplete: boolean) {
  const [state, setState] = useState(createInitialArenaState);
  const [error, setError] = useState<string>();
  const matchIdRef = useRef<string | undefined>(undefined);
  const stateRef = useRef(state);
  const leavingTimerRef = useRef<number | undefined>(undefined);

  const commit = useCallback((next: ArenaMatchState) => {
    stateRef.current = next;
    setState(next);
  }, []);

  useEffect(() => {
    window.clearTimeout(leavingTimerRef.current);
    if (!preloadComplete) return;
    let cancelled = false;
    let polling = false;

    const applyResponse = (result: MatchResponse) => {
      if (cancelled) return;
      matchIdRef.current = result.matchId;
      commit(result.state);
      setError(undefined);
    };

    arenaRequest({ action: "queue", roomCode })
      .then(applyResponse)
      .catch((reason: unknown) => {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not enter the arena queue");
      });

    const poll = async () => {
      const matchId = matchIdRef.current;
      if (!matchId || polling || stateRef.current.phase === "match-end") return;
      polling = true;
      try {
        const response = await fetch(`/api/arena?matchId=${encodeURIComponent(matchId)}`, { cache: "no-store" });
        const result = await response.json() as MatchResponse;
        if (!response.ok) throw new Error(result.error || "Could not sync the match");
        applyResponse(result);
      } catch (reason) {
        if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not sync the match");
      } finally {
        polling = false;
      }
    };

    const pollTimer = window.setInterval(() => { void poll(); }, 500);
    const queueTimer = window.setInterval(() => {
      if (stateRef.current.phase !== "waiting") return;
      arenaRequest({ action: "queue", roomCode })
        .then(applyResponse)
        .catch((reason: unknown) => {
          if (!cancelled) setError(reason instanceof Error ? reason.message : "Could not refresh the arena queue");
        });
    }, 1_500);
    return () => {
      cancelled = true;
      window.clearInterval(pollTimer);
      window.clearInterval(queueTimer);
      const matchId = matchIdRef.current;
      if (!matchId || stateRef.current.phase === "match-end") return;
      leavingTimerRef.current = window.setTimeout(() => {
        void fetch("/api/arena", {
          body: JSON.stringify({ action: "leave", matchId }),
          headers: { "content-type": "application/json" },
          keepalive: true,
          method: "POST",
        });
      }, 0);
    };
  }, [commit, preloadComplete, roomCode]);

  const attemptHit = useCallback(async () => {
    const matchId = matchIdRef.current;
    const current = stateRef.current;
    if (!matchId || current.phase !== "round") return;
    try {
      const result = await arenaRequest({ action: "hit", matchId, round: current.round });
      commit(result.state);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "The hit could not be recorded");
    }
  }, [commit]);

  return { attemptHit, error, state };
}
