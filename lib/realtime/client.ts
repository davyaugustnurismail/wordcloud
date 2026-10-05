"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, HandshakeAuth, ServerToClientEvents } from "./events";

export type RealtimeClient = Socket<ServerToClientEvents, ClientToServerEvents>;

export function connectRealtime(auth: HandshakeAuth): RealtimeClient {
  return io({
    transports: ["websocket"],
    auth,
    reconnectionDelayMax: 3000,
  });
}

const DEVICE_KEY = "wc-device";

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function getDeviceId(): string {
  try {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) return stored;
    const created = randomId();
    localStorage.setItem(DEVICE_KEY, created);
    return created;
  } catch {
    return randomId();
  }
}
