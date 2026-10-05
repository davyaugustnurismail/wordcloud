import type { Server as HttpServer } from "node:http";
import { createAdapter } from "@socket.io/redis-adapter";
import { Server } from "socket.io";
import { adminCookieName, verifyAdminToken } from "../auth/admin-cookie";
import { GLOBAL_COOKIE_NAME, verifyGlobalToken } from "../auth/global-cookie";
import { parseCookieHeader } from "../auth/cookies";
import { openReadyToken, readyCookieName } from "../auth/ready-cookie";
import { isValidCode, normalizeCode } from "../code";
import { getEnv } from "../env";
import { resolveClientIp } from "../http";
import { createAdapterClients } from "../redis";
import { findSessionByCode, type SessionRecord } from "../sessions";
import { handshakeAuthSchema } from "./events";
import { onConnection } from "./connection";
import { isOriginAllowed } from "./origin";
import type { RealtimeServer } from "./types";

export type { RealtimeServer } from "./types";

const KEY = Symbol.for("wordcloud.io");
type Holder = typeof globalThis & { [KEY]?: RealtimeServer };

const lookups = new Map<string, Promise<SessionRecord | null>>();

function lookupSession(code: string): Promise<SessionRecord | null> {
  const pending = lookups.get(code);
  if (pending) return pending;
  const started = findSessionByCode(code).finally(() => lookups.delete(code));
  lookups.set(code, started);
  return started;
}

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
    pingInterval: 10_000,
    pingTimeout: 10_000,
    connectTimeout: 10_000,
    maxHttpBufferSize: 16 * 1024,
    allowRequest: (req, callback) => {
      callback(null, isOriginAllowed(req.headers.origin, policy));
    },
  });

  const { pub, sub } = createAdapterClients();
  io.adapter(createAdapter(pub, sub));

  io.use(async (socket, next) => {
    try {
      const parsed = handshakeAuthSchema.safeParse(socket.handshake.auth);
      if (!parsed.success) return next(new Error("invalid_auth"));

      const code = normalizeCode(parsed.data.code);
      const session = isValidCode(code) ? await lookupSession(code) : null;
      if (!session) return next(new Error("session_not_found"));

      const cookies = parseCookieHeader(socket.handshake.headers.cookie);
      if (parsed.data.role === "ready") {
        const opened = await openReadyToken(cookies[readyCookieName(code)], code);
        if (!opened) return next(new Error("unauthorized"));
      }
      if (parsed.data.role === "admin") {
        const allowed =
          (await verifyGlobalToken(cookies[GLOBAL_COOKIE_NAME])) ||
          (await verifyAdminToken(cookies[adminCookieName(code)], code, session.adminEpoch));
        if (!allowed) return next(new Error("unauthorized"));
      }

      socket.data = {
        session,
        role: parsed.data.role,
        deviceId: parsed.data.deviceId ?? null,
        ip: resolveClientIp(socket.handshake.address, socket.handshake.headers, env.TRUST_PROXY),
      };
      next();
    } catch (err) {
      console.error(`[handshake] ${(err as Error).message}`);
      next(new Error("server_error"));
    }
  });

  io.on("connection", (socket) => {
    onConnection(io, socket).catch((err: Error) => {
      console.error(`[connection] ${err.message}`);
      socket.disconnect(true);
    });
  });

  (globalThis as Holder)[KEY] = io;
  return io;
}
