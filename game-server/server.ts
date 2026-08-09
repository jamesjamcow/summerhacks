import { createServer } from "node:http";

import { defineRoom, defineServer, matchMaker } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import cors from "cors";

import { ArenaRoom } from "./rooms/arena-room";

const allowedOrigins = (process.env.ARENA_ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

matchMaker.controller.DEFAULT_CORS_HEADERS["Access-Control-Allow-Credentials"] = "true";
matchMaker.controller.getCorsHeaders = (headers) => {
  const origin = headers.get("origin");
  return {
    "Access-Control-Allow-Origin": !origin || allowedOrigins.includes(origin) ? origin || "*" : "null",
  };
};

export const arenaServer = defineServer({
  rooms: {
    memory_arena: defineRoom(ArenaRoom).filterBy(["roomCode"]),
  },
  express: (app) => {
    app.use(cors({
      credentials: true,
      origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) callback(null, true);
        else callback(null, false);
      },
    }));
    app.get("/health", (_request: unknown, response: { json: (body: unknown) => void }) => {
      response.json({ service: "summerhacks-arena", status: "ok" });
    });
  },
  greet: true,
  transport: new WebSocketTransport({
    server: createServer(),
    verifyClient(info, done) {
      if (!info.origin || allowedOrigins.includes(info.origin)) done(true);
      else done(false, 403, "Origin is not allowed to access the arena.");
    },
  }),
});
