import { listAdminEntries, listVisibleEntries } from "../entries";
import { recordDuration } from "../metrics";
import { registerAdminHandlers } from "./moderation";
import { schedulePresence } from "./presence";
import { adminRoom, displayRoom, sessionRoom } from "./rooms";
import { handleSubmit } from "./submit";
import type { RealtimeServer, RealtimeSocket } from "./types";

const DISPLAY_SNAPSHOT_LIMIT = 1000;
const ADMIN_SNAPSHOT_LIMIT = 2000;

async function sendSnapshot(socket: RealtimeSocket) {
  const { session, role } = socket.data;
  const info = { code: session.code, name: session.name };

  if (role === "admin") {
    socket.emit("admin:snapshot", {
      session: info,
      settings: session.settings,
      state: session.state,
      entries: await listAdminEntries(session.id, ADMIN_SNAPSHOT_LIMIT),
    });
    return;
  }

  socket.emit("snapshot", {
    session: info,
    settings: session.settings,
    state: session.state,
    entries:
      role === "display"
        ? await listVisibleEntries(session.id, session.state.clearedAt, DISPLAY_SNAPSHOT_LIMIT)
        : [],
  });
}

export async function onConnection(io: RealtimeServer, socket: RealtimeSocket): Promise<void> {
  const { session, role } = socket.data;

  socket.on("entry:submit", (payload, ack) => {
    if (typeof ack !== "function") return;
    const startedAt = performance.now();
    handleSubmit(io, socket, payload)
      .then(ack)
      .catch((err: Error) => {
        console.error(`[submit] ${err.message}`);
        ack({ status: "rejected", reason: "error" });
      })
      .finally(() => recordDuration("submit", performance.now() - startedAt));
  });

  if (role === "admin") registerAdminHandlers(io, socket);

  socket.on("disconnect", () => schedulePresence(io, session.id));

  if (role === "ready" || role === "admin") {
    await socket.join(adminRoom(session.id));
  } else {
    await socket.join(sessionRoom(session.id));
    if (role === "display") await socket.join(displayRoom(session.id));
  }

  await sendSnapshot(socket);
  schedulePresence(io, session.id);
}
