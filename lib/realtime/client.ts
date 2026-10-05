"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, ServerToClientEvents } from "./events";

export type RealtimeClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export function connectRealtime(): RealtimeClient {
  return io({ transports: ["websocket"] });
}
