import type { PresencePayload } from "./events";
import { adminRoom, sessionRoom } from "./rooms";
import type { RealtimeServer } from "./types";

const PRESENCE_DEBOUNCE_MS = 200;

const timers = new Map<string, NodeJS.Timeout>();

export async function computePresence(io: RealtimeServer, sessionId: string): Promise<PresencePayload> {
  const [members, staff] = await Promise.all([
    io.in(sessionRoom(sessionId)).fetchSockets(),
    io.in(adminRoom(sessionId)).fetchSockets(),
  ]);
  const presence: PresencePayload = { display: 0, input: 0, admin: 0 };
  for (const socket of members) {
    if (socket.data.role === "display") presence.display++;
    else if (socket.data.role === "input") presence.input++;
  }
  for (const socket of staff) {
    if (socket.data.role === "admin") presence.admin++;
  }
  return presence;
}

export function schedulePresence(io: RealtimeServer, sessionId: string) {
  if (timers.has(sessionId)) return;
  const timer = setTimeout(() => {
    timers.delete(sessionId);
    computePresence(io, sessionId)
      .then((presence) => io.to(adminRoom(sessionId)).emit("presence", presence))
      .catch((err: Error) => console.error(`[presence] ${err.message}`));
  }, PRESENCE_DEBOUNCE_MS);
  timers.set(sessionId, timer);
}
