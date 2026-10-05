export type PingAck = { ok: true; at: number };

export interface ServerToClientEvents {
  "server:ready": (payload: { at: number }) => void;
}

export interface ClientToServerEvents {
  "ping:check": (ack: (result: PingAck) => void) => void;
}
