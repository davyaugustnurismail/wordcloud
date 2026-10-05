import { isAssetUsable } from "../assets";
import { isTermBlocked } from "../blocklist";
import { approveEntries, editEntry, hideEntry, rejectEntry, restoreEntry } from "../entries";
import { applyControl, findSessionById, setModerationMode, updateSessionSettings } from "../sessions";
import { sessionSettingsSchema, settingsPatchSchema } from "../settings";
import { checkWord, normalizeWord } from "../words";
import {
  approvePayloadSchema,
  controlPayloadSchema,
  editPayloadSchema,
  entryIdPayloadSchema,
  moderationPayloadSchema,
  type AdminAck,
} from "./events";
import { publishAdminEntry, publishHidden, publishShown, publishUpdated } from "./publish";
import { adminRoom, sessionRoom } from "./rooms";
import type { RealtimeServer, RealtimeSocket } from "./types";

const ACTOR = "admin-sesi";

const forbidden: AdminAck = { ok: false, reason: "forbidden" };
const invalid: AdminAck = { ok: false, reason: "invalid" };
const notFound: AdminAck = { ok: false, reason: "not_found" };
const ok: AdminAck = { ok: true };

function respond(ack: unknown, work: () => Promise<AdminAck>) {
  if (typeof ack !== "function") return;
  const reply = ack as (result: AdminAck) => void;
  work()
    .then(reply)
    .catch((err: Error) => {
      console.error(`[moderation] ${err.message}`);
      reply({ ok: false, reason: "error" });
    });
}

export function registerAdminHandlers(io: RealtimeServer, socket: RealtimeSocket) {
  const sessionId = socket.data.session.id;
  const isAdmin = () => socket.data.role === "admin";

  socket.on("entry:approve", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = approvePayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const approved = await approveEntries(sessionId, parsed.data.ids, ACTOR);
      for (const row of approved) {
        publishShown(io, sessionId, row);
        publishAdminEntry(io, sessionId, row);
      }
      return approved.length > 0 ? ok : notFound;
    }),
  );

  socket.on("entry:reject", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = entryIdPayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const row = await rejectEntry(sessionId, parsed.data.id, ACTOR);
      if (!row) return notFound;
      publishAdminEntry(io, sessionId, row);
      return ok;
    }),
  );

  socket.on("entry:hide", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = entryIdPayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const row = await hideEntry(sessionId, parsed.data.id, ACTOR);
      if (!row) return notFound;
      publishHidden(io, sessionId, row);
      publishAdminEntry(io, sessionId, row);
      return ok;
    }),
  );

  socket.on("entry:restore", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = entryIdPayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const session = await findSessionById(sessionId);
      if (!session) return notFound;
      const row = await restoreEntry(sessionId, parsed.data.id, session.state.clearedAt, ACTOR);
      if (!row) return notFound;
      publishShown(io, sessionId, row);
      publishAdminEntry(io, sessionId, row);
      return ok;
    }),
  );

  socket.on("entry:edit", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = editPayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const session = await findSessionById(sessionId);
      if (!session) return notFound;
      const checked = checkWord(parsed.data.text, session.settings.maxChars);
      if (!checked.ok) return invalid;
      const normalized = normalizeWord(checked.text);
      if (await isTermBlocked(sessionId, normalized)) return { ok: false, reason: "blocked" };
      const row = await editEntry(sessionId, parsed.data.id, checked.text, normalized, ACTOR);
      if (!row) return notFound;
      if (row.status === "visible") publishUpdated(io, sessionId, row);
      publishAdminEntry(io, sessionId, row);
      return ok;
    }),
  );

  socket.on("moderation:set", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = moderationPayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const settings = await setModerationMode(sessionId, parsed.data.mode);
      io.to(sessionRoom(sessionId)).to(adminRoom(sessionId)).emit("settings:update", settings);
      return ok;
    }),
  );

  socket.on("settings:patch", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = settingsPatchSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const patch = parsed.data;
      const session = await findSessionById(sessionId);
      if (!session) return notFound;

      if (patch.photowallBgId && !(await isAssetUsable(patch.photowallBgId, sessionId, "photowall_bg"))) return notFound;
      if (patch.inputBgId && !(await isAssetUsable(patch.inputBgId, sessionId, "input_bg"))) return notFound;

      const merged = sessionSettingsSchema.safeParse({ ...session.settings, ...patch });
      if (!merged.success) return invalid;
      const saved = await updateSessionSettings(sessionId, merged.data);
      io.to(sessionRoom(sessionId)).to(adminRoom(sessionId)).emit("settings:update", saved);
      return ok;
    }),
  );

  socket.on("session:control", (payload, ack) =>
    respond(ack, async () => {
      if (!isAdmin()) return forbidden;
      const parsed = controlPayloadSchema.safeParse(payload);
      if (!parsed.success) return invalid;
      const state = await applyControl(sessionId, parsed.data.action);
      io.to(sessionRoom(sessionId)).to(adminRoom(sessionId)).emit("session:state", state);
      return ok;
    }),
  );
}
