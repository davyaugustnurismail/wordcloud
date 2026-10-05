import { toAdminDto, toEntryDto, type EntryRow } from "../entries";
import { adminRoom, displayRoom } from "./rooms";
import type { RealtimeServer } from "./types";

export function publishShown(io: RealtimeServer, sessionId: string, row: EntryRow) {
  io.to(displayRoom(sessionId)).emit("entry:shown", toEntryDto(row));
}

export function publishHidden(io: RealtimeServer, sessionId: string, row: EntryRow) {
  io.to(displayRoom(sessionId)).emit("entry:hidden", { id: row.id });
}

export function publishUpdated(io: RealtimeServer, sessionId: string, row: EntryRow) {
  io.to(displayRoom(sessionId)).emit("entry:updated", { id: row.id, text: row.text });
}

export function publishAdminEntry(io: RealtimeServer, sessionId: string, row: EntryRow) {
  io.to(adminRoom(sessionId)).emit("admin:entry", toAdminDto(row));
}
