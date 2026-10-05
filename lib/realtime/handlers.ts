import { hitRateLimit } from "../rate-limit";
import { findSessionById, insertVisibleEntry, isTermBlocked, listVisibleEntries } from "../sessions";
import { checkWord, normalizeWord } from "../words";
import { submitPayloadSchema, type PresencePayload, type SnapshotPayload, type SubmitAck } from "./events";
import { adminRoom, displayRoom, sessionRoom } from "./rooms";
import type { RealtimeServer, RealtimeSocket } from "./types";

const SNAPSHOT_LIMIT = 1000;
const SUBMIT_LIMIT = 8;
const SUBMIT_WINDOW_SEC = 10;
const PRESENCE_DEBOUNCE_MS = 200;

const presenceTimers = new Map<string, NodeJS.Timeout>();

async function computePresence(io: RealtimeServer, sessionId: string): Promise<PresencePayload> {
  const sockets = await io.in(sessionRoom(sessionId)).fetchSockets();
  const presence: PresencePayload = { display: 0, input: 0 };
  for (const socket of sockets) {
    if (socket.data.role === "display") presence.display++;
    else if (socket.data.role === "input") presence.input++;
  }
  return presence;
}

function schedulePresence(io: RealtimeServer, sessionId: string) {
  if (presenceTimers.has(sessionId)) return;
  const timer = setTimeout(() => {
    presenceTimers.delete(sessionId);
    computePresence(io, sessionId)
      .then((presence) => io.to(adminRoom(sessionId)).emit("presence", presence))
      .catch((err: Error) => console.error(`[presence] ${err.message}`));
  }, PRESENCE_DEBOUNCE_MS);
  presenceTimers.set(sessionId, timer);
}

async function buildSnapshot(socket: RealtimeSocket): Promise<SnapshotPayload> {
  const { session, role } = socket.data;
  const entries = role === "display" ? await listVisibleEntries(session.id, SNAPSHOT_LIMIT) : [];
  return {
    session: { code: session.code, name: session.name },
    settings: session.settings,
    entries,
  };
}

async function handleSubmit(io: RealtimeServer, socket: RealtimeSocket, payload: unknown): Promise<SubmitAck> {
  if (socket.data.role !== "input") return { status: "rejected", reason: "invalid" };

  const parsed = submitPayloadSchema.safeParse(payload);
  if (!parsed.success) return { status: "rejected", reason: "invalid" };

  const limit = await hitRateLimit(
    `submit:${socket.data.ip}:${socket.data.deviceId ?? socket.id}`,
    SUBMIT_LIMIT,
    SUBMIT_WINDOW_SEC,
  );
  if (!limit.allowed) return { status: "rejected", reason: "rate_limited" };

  const session = await findSessionById(socket.data.session.id);
  if (!session) return { status: "rejected", reason: "invalid" };

  const checked = checkWord(parsed.data.text, session.settings.maxChars);
  if (!checked.ok) return { status: "rejected", reason: checked.reason === "space" ? "space" : "invalid" };

  const normalized = normalizeWord(checked.text);
  if (await isTermBlocked(session.id, normalized)) return { status: "rejected", reason: "blocked" };

  const entry = await insertVisibleEntry({
    sessionId: session.id,
    text: checked.text,
    normalized,
    deviceId: socket.data.deviceId,
  });

  io.to(displayRoom(session.id)).to(adminRoom(session.id)).emit("entry:shown", entry);
  return { status: "shown", id: entry.id };
}

export async function onConnection(io: RealtimeServer, socket: RealtimeSocket): Promise<void> {
  const { session, role } = socket.data;

  socket.on("entry:submit", (payload, ack) => {
    if (typeof ack !== "function") return;
    handleSubmit(io, socket, payload)
      .then(ack)
      .catch((err: Error) => {
        console.error(`[submit] ${err.message}`);
        ack({ status: "rejected", reason: "error" });
      });
  });

  socket.on("disconnect", () => schedulePresence(io, session.id));

  if (role === "ready") {
    await socket.join(adminRoom(session.id));
  } else {
    await socket.join(sessionRoom(session.id));
    if (role === "display") await socket.join(displayRoom(session.id));
  }

  socket.emit("snapshot", await buildSnapshot(socket));
  schedulePresence(io, session.id);
}
