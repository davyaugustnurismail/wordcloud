import { z } from "zod";
import type { SessionSettings } from "../settings";

export const clientRoleSchema = z.enum(["display", "input", "ready", "admin"]);
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

const entryId = z.uuid();

export const approvePayloadSchema = z.object({ ids: z.array(entryId).min(1).max(500) });
export const entryIdPayloadSchema = z.object({ id: entryId });
export const editPayloadSchema = z.object({ id: entryId, text: z.string().max(200) });
export const moderationPayloadSchema = z.object({ mode: z.enum(["langsung", "approve"]) });
export const controlActions = ["pause", "resume", "freeze", "unfreeze", "clear"] as const;
export const controlPayloadSchema = z.object({ action: z.enum(controlActions) });

export type ControlAction = (typeof controlActions)[number];

export type RejectReason = "invalid" | "space" | "blocked" | "rate_limited" | "paused" | "error";
export type SubmitAck = { status: "shown" | "pending"; id: string } | { status: "rejected"; reason: RejectReason };

export type AdminReason = "forbidden" | "invalid" | "not_found" | "conflict" | "blocked" | "error";
export type AdminAck = { ok: true } | { ok: false; reason: AdminReason };

export type EntryStatus = "pending" | "visible" | "hidden";

export type EntryDto = { id: string; text: string; shownAt: number };

export type AdminEntryDto = {
  id: string;
  text: string;
  status: EntryStatus;
  createdAt: number;
  shownAt: number | null;
  deviceId: string | null;
};

export type SessionState = {
  paused: boolean;
  frozen: boolean;
  clearedAt: number | null;
};

export type SessionInfo = { code: string; name: string };

export type SnapshotPayload = {
  session: SessionInfo;
  settings: SessionSettings;
  state: SessionState;
  entries: EntryDto[];
};

export type AdminSnapshotPayload = {
  session: SessionInfo;
  settings: SessionSettings;
  state: SessionState;
  entries: AdminEntryDto[];
};

export type PresencePayload = { display: number; input: number; admin: number };

export interface ServerToClientEvents {
  snapshot: (payload: SnapshotPayload) => void;
  "admin:snapshot": (payload: AdminSnapshotPayload) => void;
  "entry:shown": (entry: EntryDto) => void;
  "entry:hidden": (payload: { id: string }) => void;
  "entry:updated": (payload: { id: string; text: string }) => void;
  "admin:entry": (entry: AdminEntryDto) => void;
  "session:state": (state: SessionState) => void;
  "settings:update": (settings: SessionSettings) => void;
  presence: (payload: PresencePayload) => void;
}

export interface ClientToServerEvents {
  "entry:submit": (payload: SubmitPayload, ack: (result: SubmitAck) => void) => void;
  "entry:approve": (payload: z.infer<typeof approvePayloadSchema>, ack: (result: AdminAck) => void) => void;
  "entry:reject": (payload: z.infer<typeof entryIdPayloadSchema>, ack: (result: AdminAck) => void) => void;
  "entry:hide": (payload: z.infer<typeof entryIdPayloadSchema>, ack: (result: AdminAck) => void) => void;
  "entry:restore": (payload: z.infer<typeof entryIdPayloadSchema>, ack: (result: AdminAck) => void) => void;
  "entry:edit": (payload: z.infer<typeof editPayloadSchema>, ack: (result: AdminAck) => void) => void;
  "moderation:set": (payload: z.infer<typeof moderationPayloadSchema>, ack: (result: AdminAck) => void) => void;
  "session:control": (payload: z.infer<typeof controlPayloadSchema>, ack: (result: AdminAck) => void) => void;
}
