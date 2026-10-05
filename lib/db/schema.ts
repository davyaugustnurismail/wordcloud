import {
  boolean,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const sessionStatus = pgEnum("session_status", ["active", "ended"]);
export const entryStatus = pgEnum("entry_status", ["pending", "visible", "hidden"]);
export const assetKind = pgEnum("asset_kind", ["input_bg", "photowall_bg", "mask"]);
export const moderationAction = pgEnum("moderation_action", ["approve", "hide", "edit", "restore"]);

const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const sessions = pgTable("sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 6 }).notNull().unique(),
  name: text("name").notNull(),
  pinHash: text("pin_hash").notNull(),
  pinEncrypted: text("pin_encrypted"),
  status: sessionStatus("status").notNull().default("active"),
  settings: jsonb("settings").$type<Record<string, unknown>>().notNull().default({}),
  paused: boolean("paused").notNull().default(false),
  frozen: boolean("frozen").notNull().default(false),
  clearedAt: timestamp("cleared_at", { withTimezone: true }),
  adminEpoch: integer("admin_epoch").notNull().default(0),
  createdAt: createdAt(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const entries = pgTable(
  "entries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => sessions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    normalized: text("normalized").notNull(),
    status: entryStatus("status").notNull(),
    createdAt: createdAt(),
    shownAt: timestamp("shown_at", { withTimezone: true }),
    deviceId: text("device_id"),
  },
  (t) => [
    index("entries_session_shown_idx").on(t.sessionId, t.shownAt),
    index("entries_session_status_idx").on(t.sessionId, t.status),
  ],
);

export const blockedTerms = pgTable(
  "blocked_terms",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    term: text("term").notNull(),
    sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [unique("blocked_terms_term_session_uq").on(t.term, t.sessionId).nullsNotDistinct()],
);

export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  sessionId: uuid("session_id").references(() => sessions.id, { onDelete: "cascade" }),
  kind: assetKind("kind").notNull(),
  path: text("path").notNull(),
  createdAt: createdAt(),
});

export const moderationLogs = pgTable("moderation_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  entryId: uuid("entry_id")
    .notNull()
    .references(() => entries.id, { onDelete: "cascade" }),
  action: moderationAction("action").notNull(),
  actor: text("actor").notNull(),
  createdAt: createdAt(),
});

export const appSettings = pgTable("app_settings", {
  key: text("key").primaryKey(),
  value: jsonb("value").$type<unknown>().notNull(),
});
