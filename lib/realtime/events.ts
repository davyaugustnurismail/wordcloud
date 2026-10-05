import { z } from "zod";
import type { SessionSettings } from "../settings";

export const clientRoleSchema = z.enum(["display", "input", "ready"]);
export type ClientRole = z.infer<typeof clientRoleSchema>;

export const handshakeAuthSchema = z.object({
  code: z.string().min(1).max(16),
  role: clientRoleSchema,
  deviceId: z.string().min(1).max(64).optional(),
});
export type HandshakeAuth = z.infer<typeof handshakeAuthSchema>;

export const submitPayloadSchema = z.object({
  text: z.string().max(200),
});
export type SubmitPayload = z.infer<typeof submitPayloadSchema>;

export type RejectReason = "invalid" | "space" | "blocked" | "rate_limited" | "error";
export type SubmitAck = { status: "shown"; id: string } | { status: "rejected"; reason: RejectReason };

export type EntryDto = { id: string; text: string; shownAt: number };

export type SnapshotPayload = {
  session: { code: string; name: string };
  settings: SessionSettings;
  entries: EntryDto[];
};

export type PresencePayload = { display: number; input: number };

export interface ServerToClientEvents {
  snapshot: (payload: SnapshotPayload) => void;
  "entry:shown": (entry: EntryDto) => void;
  presence: (payload: PresencePayload) => void;
}

export interface ClientToServerEvents {
  "entry:submit": (payload: SubmitPayload, ack: (result: SubmitAck) => void) => void;
}
