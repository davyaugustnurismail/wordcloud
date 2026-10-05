"use client";

import { useMemo, useState, type FormEvent } from "react";
import { formatClock } from "@/lib/format";
import type { AdminAck, AdminEntryDto } from "@/lib/realtime/events";
import { checkWord } from "@/lib/words";
import { EyeIcon, EyeOffIcon, PencilIcon } from "../icons";
import { useAdmin } from "./admin-provider";
import { failureMessage } from "./feedback";

type Filter = "semua" | "tampil" | "sembunyi";

const FEED_LIMIT = 300;

const filters: { id: Filter; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "tampil", label: "Tampil" },
  { id: "sembunyi", label: "Disembunyikan" },
];

type RowProps = {
  entry: AdminEntryDto;
  centered: boolean;
  cleared: boolean;
  device: string;
  report: (ack: AdminAck) => void;
};

function FeedRow({ entry, centered, cleared, device, report }: RowProps) {
  const { actions, settings, connected } = useAdmin();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(entry.text);
  const [editError, setEditError] = useState<string | null>(null);

  const hidden = entry.status === "hidden";
  const statusLabel = hidden ? "Disembunyikan" : cleared ? "Di-clear" : "Tampil";
  const statusTone = hidden || cleared ? "bg-fg/6 text-muted" : "bg-live/15 text-live";

  const toggle = async () => report(hidden ? await actions.restore(entry.id) : await actions.hide(entry.id));

  const startEdit = () => {
    setDraft(entry.text);
    setEditError(null);
    setEditing(true);
  };

  const save = async (event: FormEvent) => {
    event.preventDefault();
    const checked = checkWord(draft, settings.maxChars);
    if (!checked.ok) {
      setEditError(checked.reason === "space" ? "Cukup satu kata, tanpa spasi." : "Kata tidak boleh kosong.");
      return;
    }
    if (checked.text === entry.text) {
      setEditing(false);
      return;
    }
    const ack = await actions.edit(entry.id, checked.text);
    if (ack.ok) {
      setEditing(false);
      return;
    }
    setEditError(failureMessage(ack));
  };

  return (
    <div className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2 md:px-5 md:py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 md:gap-[3px]">
        {editing ? (
          <form onSubmit={save} className="m-0 flex flex-col gap-1.5">
            <div className="flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") setEditing(false);
                }}
                aria-label={`Perbaiki kata ${entry.text}`}
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="h-11 min-w-0 flex-1 rounded-xl border border-ring bg-field px-3.5 text-lg font-bold text-fg focus:outline-none"
              />
              <button type="submit" className="h-11 rounded-xl bg-primary px-3.5 text-sm font-extrabold text-on-primary">
                Simpan
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="h-11 rounded-xl border border-line px-3.5 text-sm font-bold text-fg"
              >
                Batal
              </button>
            </div>
            {editError ? (
              <span role="alert" className="text-[13px] font-bold text-danger">
                {editError}
              </span>
            ) : null}
          </form>
        ) : (
          <div className="flex items-center gap-2.5">
            <span
              className={`truncate text-lg font-extrabold md:text-[22px] ${hidden ? "text-muted line-through" : "text-fg"}`}
            >
              {entry.text}
            </span>
            {centered ? (
              <span className="flex h-6 shrink-0 items-center rounded-md bg-hl px-2 text-xs font-extrabold text-on-hl">
                Di tengah
              </span>
            ) : null}
          </div>
        )}
        <span className="flex items-center gap-2 text-xs text-muted md:text-[13px]">
          {formatClock(entry.shownAt ?? entry.createdAt)} · <span className="hidden md:inline">{device}</span>
          <span className={`flex h-[22px] items-center rounded-md px-2 text-xs font-bold ${statusTone}`}>{statusLabel}</span>
        </span>
      </div>
      <div className="flex shrink-0 gap-2">
        <button
          type="button"
          onClick={startEdit}
          aria-label={`Perbaiki typo ${entry.text}`}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-transparent text-fg"
        >
          <PencilIcon size={18} />
        </button>
        <button
          type="button"
          disabled={!connected}
          onClick={toggle}
          aria-label={`${hidden ? "Tampilkan lagi kata" : "Sembunyikan kata"} ${entry.text}`}
          className="flex h-11 w-11 items-center justify-center gap-1.5 rounded-xl border border-line bg-transparent text-sm font-bold text-fg disabled:opacity-50 md:w-auto md:px-3.5"
        >
          {hidden ? <EyeIcon size={18} /> : <EyeOffIcon size={18} />}
          <span className="hidden md:inline">{hidden ? "Tampilkan lagi" : "Sembunyikan"}</span>
        </button>
      </div>
    </div>
  );
}

export function FeedPanel({ report }: { report: (ack: AdminAck) => void }) {
  const { entries, state, deviceLabels } = useAdmin();
  const [filter, setFilter] = useState<Filter>("semua");
  const clearedAt = state.clearedAt;

  const feed = useMemo(() => entries.filter((entry) => entry.status !== "pending"), [entries]);
  const centerId = useMemo(
    () =>
      feed.find((entry) => entry.status === "visible" && (clearedAt === null || (entry.shownAt ?? 0) > clearedAt))?.id ??
      null,
    [feed, clearedAt],
  );
  const matching = useMemo(
    () =>
      feed.filter((entry) =>
        filter === "tampil" ? entry.status === "visible" : filter === "sembunyi" ? entry.status === "hidden" : true,
      ),
    [feed, filter],
  );
  const shown = useMemo(() => matching.slice(0, FEED_LIMIT), [matching]);

  return (
    <section aria-label="Live feed" className="overflow-hidden rounded-2xl border border-line bg-surface md:rounded-[18px]">
      <div className="flex flex-wrap items-center justify-between gap-3 px-3.5 py-3 md:px-5 md:py-4">
        <div className="flex flex-col">
          <span className="text-[15px] font-extrabold md:text-[17px]">Live feed</span>
          <span className="hidden text-[13px] text-muted md:block">
            Terbaru di atas. Kata yang sama tampil sebagai entri terpisah.
          </span>
        </div>
        <div role="group" aria-label="Filter" className="flex gap-1.5">
          {filters.map((item) => {
            const active = item.id === filter;
            return (
              <button
                key={item.id}
                type="button"
                aria-pressed={active}
                onClick={() => setFilter(item.id)}
                className={`h-9 rounded-full border px-3 text-[13px] font-bold ${
                  active ? "border-primary bg-primary text-on-primary" : "border-line bg-transparent text-fg"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </div>
      {shown.length === 0 ? <div className="border-t border-line p-5 text-sm text-muted">Belum ada kata.</div> : null}
      {shown.map((entry) => (
        <FeedRow
          key={entry.id}
          entry={entry}
          centered={entry.id === centerId}
          cleared={entry.status === "visible" && clearedAt !== null && (entry.shownAt ?? 0) <= clearedAt}
          device={(entry.deviceId && deviceLabels.get(entry.deviceId)) || "—"}
          report={report}
        />
      ))}
      {matching.length > shown.length ? (
        <div role="status" className="border-t border-line px-3.5 py-3 text-[13px] text-muted md:px-5">
          Menampilkan {shown.length} kata terbaru dari {matching.length}. Seluruhnya tetap ada di database dan bisa diunduh.
        </div>
      ) : null}
    </section>
  );
}
