import { insertEntryUnlessBlocked } from "../entries";
import { measure } from "../metrics";
import { hitRateLimit } from "../rate-limit";
import { findSessionById } from "../sessions";
import { blockKeys, checkWord, normalizeWord } from "../words";
import { submitPayloadSchema, type SubmitAck } from "./events";
import { publishAdminEntry, publishShown } from "./publish";
import type { RealtimeServer, RealtimeSocket } from "./types";

const SUBMIT_LIMIT = 8;
const SUBMIT_WINDOW_SEC = 10;

export async function handleSubmit(io: RealtimeServer, socket: RealtimeSocket, payload: unknown): Promise<SubmitAck> {
  if (socket.data.role !== "input") return { status: "rejected", reason: "invalid" };

  const parsed = submitPayloadSchema.safeParse(payload);
  if (!parsed.success) return { status: "rejected", reason: "invalid" };

  const limit = await measure("submit.ratelimit", () =>
    hitRateLimit(`submit:${socket.data.ip}:${socket.data.deviceId ?? socket.id}`, SUBMIT_LIMIT, SUBMIT_WINDOW_SEC),
  );
  if (!limit.allowed) return { status: "rejected", reason: "rate_limited" };

  const session = await measure("submit.session", () => findSessionById(socket.data.session.id));
  if (!session) return { status: "rejected", reason: "invalid" };
  if (session.state.ended) return { status: "rejected", reason: "ended" };
  if (session.state.paused) return { status: "rejected", reason: "paused" };

  const checked = checkWord(parsed.data.text, session.settings.maxChars);
  if (!checked.ok) return { status: "rejected", reason: checked.reason === "space" ? "space" : "invalid" };

  const normalized = normalizeWord(checked.text);
  const approve = session.settings.moderationMode === "approve";
  const row = await measure("submit.insert", () =>
    insertEntryUnlessBlocked({
      sessionId: session.id,
      text: checked.text,
      normalized,
      blockKeys: blockKeys(parsed.data.text, checked.text),
      deviceId: socket.data.deviceId,
      status: approve ? "pending" : "visible",
    }),
  );
  if (!row) return { status: "rejected", reason: "blocked" };

  if (!approve) publishShown(io, session.id, row);
  publishAdminEntry(io, session.id, row);
  return { status: approve ? "pending" : "shown", id: row.id };
}
