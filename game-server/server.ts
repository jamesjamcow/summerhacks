import cors from "cors";
import { defineRoom, defineServer } from "colyseus";

import { ArenaRoom } from "./rooms/arena-room";

const allowedOrigins = (process.env.ARENA_ALLOWED_ORIGINS || "http://localhost:3000,http://localhost:3001")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

export const arenaServer = defineServer({
  rooms: {
    memory_arena: defineRoom(ArenaRoom).filterBy(["roomCode"]),
  },
  express: (app) => {
    app.use(cors({
      credentials: false,
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
});
