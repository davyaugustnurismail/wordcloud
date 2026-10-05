"use client";

import { io, type Socket } from "socket.io-client";
import type { ClientToServerEvents, HandshakeAuth, ServerToClientEvents } from "./events";

export type RealtimeClient = Socket<ServerToClientEvents, ClientToServerEvents>;

const RETRY_STEP_MS = 1000;
const RETRY_MAX_MS = 5000;

export function connectRealtime(auth: HandshakeAuth): RealtimeClient {
  const socket: RealtimeClient = io({
    transports: ["websocket"],
    auth,
    reconnectionDelayMax: 3000,
  });

  let attempts = 0;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  socket.on("connect", () => {
    attempts = 0;
  });

  socket.on("connect_error", (error) => {
    if (socket.active || error.message !== "server_error") return;
    clearTimeout(retryTimer);
    attempts++;
    retryTimer = setTimeout(() => socket.connect(), Math.min(RETRY_STEP_MS * attempts, RETRY_MAX_MS));
  });

  const disconnect = socket.disconnect.bind(socket);
  socket.disconnect = () => {
    clearTimeout(retryTimer);
    return disconnect();
  };

  return socket;
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
