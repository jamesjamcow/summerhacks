"use client";

import { Client, type Room } from "@colyseus/sdk";
import { useCallback, useEffect, useRef, useState } from "react";

import {
  ArenaState,
  snapshotArenaState,
  type ArenaRealtimeSnapshot,
} from "@/lib/arena-realtime";

type ArenaSessionResponse = {
  endpoint?: string;
  error?: string;
  token?: string;
};

export type ArenaInputMessage = {
  forward: number;
  strafe: number;
  yaw: number;
  pitch: number;
  jump: boolean;
};

export type ArenaItemAction = "shoot" | "consume";

export function useColyseusArena(roomCode: string, enabled: boolean) {
  const [snapshot, setSnapshot] = useState<ArenaRealtimeSnapshot>();
  const [status, setStatus] = useState<"idle" | "connecting" | "connected" | "reconnecting" | "closed">("idle");
  const [error, setError] = useState<string>();
  const roomRef = useRef<Room>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let joinedRoom: Room | undefined;
    const connect = async () => {
      await Promise.resolve();
      if (cancelled) return;
      setStatus("connecting");
      setError(undefined);
      const response = await fetch("/api/arena/session", {
        body: JSON.stringify({ roomCode }),
        headers: { "content-type": "application/json" },
        method: "POST",
      });
      const session = await response.json() as ArenaSessionResponse;
      if (!response.ok || !session.endpoint || !session.token) {
        throw new Error(session.error || "Could not create an arena session.");
      }

      const client = new Client(session.endpoint);
      client.auth.token = session.token;
      const room = await client.joinOrCreate("memory_arena", { roomCode }, ArenaState);
      if (cancelled) {
        await room.leave(true);
        return;
      }

      // The default SDK refuses to reconnect when a connection drops during
      // its first five seconds, which overlaps our map generation/countdown.
      // Tailnet and Wi-Fi handoffs should retry immediately instead of turning
      // a brief Chrome interruption into a 0-0 forfeit.
      room.reconnection.minUptime = 0;
      room.reconnection.maxRetries = 30;
      room.reconnection.minDelay = 100;
      room.reconnection.maxDelay = 2_000;
      room.reconnection.maxEnqueuedMessages = 20;

      joinedRoom = room;
      roomRef.current = room;
      const applyState = (state: ArenaState) => {
        if (!cancelled) setSnapshot(snapshotArenaState(state));
      };
      applyState(room.state as ArenaState);
      room.onStateChange((state) => applyState(state as ArenaState));
      room.onDrop(() => {
        if (!cancelled) setStatus("reconnecting");
      });
      room.onReconnect(() => {
        if (!cancelled) {
          setStatus("connected");
          setError(undefined);
        }
      });
      room.onError((_code, message) => {
        if (!cancelled) setError(message || "The realtime arena reported an error.");
      });
      room.onLeave((_code, reason) => {
        if (!cancelled) {
          setStatus("closed");
          if (reason) setError(reason);
        }
      });
      setStatus("connected");
    };

    connect().catch((reason: unknown) => {
      if (!cancelled) {
        setStatus("closed");
        setError(reason instanceof Error ? reason.message : "Could not connect to the realtime arena.");
      }
    });

    return () => {
      cancelled = true;
      roomRef.current = null;
      joinedRoom?.removeAllListeners();
      if (joinedRoom) void joinedRoom.leave(true);
    };
  }, [enabled, roomCode]);

  const sendInput = useCallback((input: ArenaInputMessage) => {
    roomRef.current?.send("input", input);
  }, []);

  const useItem = useCallback((action: ArenaItemAction) => {
    roomRef.current?.send("use-item", { action });
  }, []);

  return { error, sendInput, snapshot, status, useItem };
}
