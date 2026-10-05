import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { getEnv } from "../env";
import { getRedis } from "../redis";
import type { ClientToServerEvents, ServerToClientEvents } from "./events";
import { isOriginAllowed } from "./origin";

export type RealtimeServer = Server<ClientToServerEvents, ServerToClientEvents>;

const KEY = Symbol.for("wordcloud.io");
type Holder = typeof globalThis & { [KEY]?: RealtimeServer };

export function getIO(): RealtimeServer {
  const io = (globalThis as Holder)[KEY];
  if (!io) throw new Error("Socket.IO belum dijalankan (server.ts belum memanggil attachRealtime)");
  return io;
}

export function attachRealtime(httpServer: HttpServer): RealtimeServer {
  const env = getEnv();
  const policy = { publicUrl: env.PUBLIC_URL, allowLan: env.ALLOW_LAN_ORIGINS };

  const io: RealtimeServer = new Server(httpServer, {
    transports: ["websocket"],
    serveClient: false,
    destroyUpgrade: false,
    allowRequest: (req, callback) => {
      callback(null, isOriginAllowed(req.headers.origin, policy));
    },
  });

  const pub = getRedis();
  const sub = pub.duplicate();
  sub.on("error", (err) => console.error(`[redis:sub] ${err.message}`));
  io.adapter(createAdapter(pub, sub));

  io.on("connection", (socket) => {
    socket.emit("server:ready", { at: Date.now() });
    socket.on("ping:check", (ack) => {
      if (typeof ack === "function") ack({ ok: true, at: Date.now() });
    });
  });

  (globalThis as Holder)[KEY] = io;
  return io;
}
