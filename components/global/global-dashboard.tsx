"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { clockLabel, fillBuckets, type Bucket } from "@/lib/chart";
import { downloadSessionPng } from "@/lib/png-download";
import type { GlobalStats, SessionOverview } from "@/lib/stats";
import { HourlyChart, TopWords } from "../admin/charts";
import { DownloadIcon, SpinnerIcon } from "../icons";
import { AutoRefresh } from "./auto-refresh";

type Filter = "semua" | "aktif" | "selesai";

const HOUR_MS = 3_600_000;
const HOUR_WINDOW = 8;
const REFRESH_MS = 15_000;

const filters: { id: Filter; label: string }[] = [
  { id: "semua", label: "Semua" },
  { id: "aktif", label: "Aktif" },
  { id: "selesai", label: "Selesai" },
];

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

function formatDateTime(timestamp: number): string {
  return `${dateFormat.format(new Date(timestamp))}, ${clockLabel(timestamp)}`;
}

function Tile({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-5 py-[18px]">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-4xl font-extrabold tabular-nums">{value}</span>
    </div>
  );
}

function SessionRow({
  session,
  onResetPin,
  resetting,
}: {
  session: SessionOverview;
  onResetPin: (session: SessionOverview) => void;
  resetting: boolean;
}) {
  const [pngBusy, setPngBusy] = useState(false);
  const active = session.status === "active";
  const menuLink = "flex h-10 items-center rounded-lg px-3 text-sm font-bold text-fg hover:bg-surface2";

  const png = async () => {
    setPngBusy(true);
    try {
      await downloadSessionPng(session.code);
    } finally {
      setPngBusy(false);
    }
  };

  return (
    <div
      role="row"
      className="grid items-center gap-3 border-t border-line px-[22px] py-2"
      style={{ gridTemplateColumns: "minmax(150px, 1.5fr) 100px 100px 100px 60px 160px 250px" }}
    >
      <span role="cell" className="truncate text-[15px] font-extrabold">
        {session.name}
      </span>
      <span role="cell" className="font-mono font-bold tracking-[0.06em]">
        {session.code}
      </span>
      <span role="cell">
        <span
          className={`inline-flex h-[26px] items-center rounded-full px-2.5 text-xs font-extrabold ${
            active ? "bg-live/15 text-live" : "bg-fg/10 text-muted"
          }`}
        >
          {active ? "Aktif" : "Selesai"}
        </span>
      </span>
      <span role="cell">{session.moderationMode === "approve" ? "Approve" : "Langsung"}</span>
      <span role="cell" className="text-right font-bold tabular-nums">
        {session.entryCount}
      </span>
      <span role="cell" className="text-muted" suppressHydrationWarning>
        {formatDateTime(session.createdAt)}
      </span>
      <span role="cell" className="flex items-center justify-end gap-1.5">
        <Link
          href={`/s/${session.code}/admin`}
          className="flex h-10 items-center whitespace-nowrap rounded-[10px] bg-primary px-3 text-[13px] font-extrabold text-on-primary"
        >
          Buka admin
        </Link>
        <button
          type="button"
          disabled={resetting}
          onClick={() => onResetPin(session)}
          className="h-10 whitespace-nowrap rounded-[10px] border border-line bg-transparent px-3 text-[13px] font-bold text-fg disabled:opacity-60"
        >
          Reset PIN
        </button>
        <details className="relative">
          <summary
            aria-label={`Unduh data sesi ${session.name}`}
            className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-[10px] border border-line text-fg [&::-webkit-details-marker]:hidden"
          >
            {pngBusy ? <SpinnerIcon size={18} /> : <DownloadIcon size={18} strokeWidth={2.2} />}
          </summary>
          <div className="absolute right-0 top-11 z-10 flex min-w-[130px] flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-lg">
            <a href={`/api/sessions/${session.code}/export?format=csv`} download className={menuLink}>
              CSV
            </a>
            <a href={`/api/sessions/${session.code}/export?format=json`} download className={menuLink}>
              JSON
            </a>
            <button type="button" onClick={png} className={`${menuLink} border-0 bg-transparent text-left`}>
              PNG akhir
            </button>
          </div>
        </details>
      </span>
    </div>
  );
}

export function GlobalDashboard({ stats, sessions }: { stats: GlobalStats; sessions: SessionOverview[] }) {
  const [filter, setFilter] = useState<Filter>("semua");
  const [hours, setHours] = useState<Bucket[] | null>(null);
  const [reset, setReset] = useState<{ code: string; pin: string } | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const currentHour = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    setHours(fillBuckets(stats.hours, HOUR_MS, currentHour, HOUR_WINDOW).filter((bucket) => bucket.start >= dayStart.getTime()));
  }, [stats.hours]);

  const visible = useMemo(
    () =>
      sessions.filter((session) =>
        filter === "aktif" ? session.status === "active" : filter === "selesai" ? session.status === "ended" : true,
      ),
    [sessions, filter],
  );

  const resetPin = async (session: SessionOverview) => {
    setResettingId(session.id);
    setError(null);
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/reset-pin`, { method: "POST" });
      if (!response.ok) throw new Error("reset");
      setReset((await response.json()) as { code: string; pin: string });
    } catch {
      setError("PIN gagal direset. Coba lagi.");
    } finally {
      setResettingId(null);
    }
  };

  return (
    <main className="flex min-w-0 flex-col gap-5 px-4 py-6 md:px-8 md:pb-12">
      <AutoRefresh intervalMs={REFRESH_MS} />
      <div className="flex flex-wrap items-end justify-between gap-3.5">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.02em]">Dashboard global</h1>
          <span className="text-[15px] text-muted">Semua sesi di server ini</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href="/api/admin/export?format=csv"
            download
            className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-fg"
          >
            <DownloadIcon size={18} strokeWidth={2.2} />
            Semua data CSV
          </a>
          <a
            href="/api/admin/export?format=json"
            download
            className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-fg"
          >
            <DownloadIcon size={18} strokeWidth={2.2} />
            JSON
          </a>
        </div>
      </div>

      {reset ? (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-line bg-surface2 px-[18px] py-3.5"
        >
          <span className="text-[15px] font-semibold">
            PIN baru sesi <b>{reset.code}</b>:{" "}
            <span className="font-mono text-lg font-bold tracking-[0.06em]">
              {reset.pin.slice(0, 3)} {reset.pin.slice(3)}
            </span>
            . Berikan ke operator; sesi admin lama otomatis keluar.
          </span>
          <button
            type="button"
            onClick={() => setReset(null)}
            className="h-10 rounded-[10px] border border-line bg-surface px-3.5 text-sm font-bold text-fg"
          >
            Tutup
          </button>
        </div>
      ) : null}
      {error ? (
        <div role="alert" className="rounded-[14px] bg-surface2 px-[18px] py-3.5 text-sm font-bold text-danger">
          {error}
        </div>
      ) : null}

      <section aria-label="Ringkasan" className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3.5">
        <Tile label="Sesi aktif" value={stats.activeSessions} />
        <Tile label="Total sesi" value={stats.totalSessions} />
        <Tile label="Total kata, semua sesi" value={stats.totalEntries} />
        <Tile label="Kata unik" value={stats.uniqueWords} />
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <section className="flex min-w-0 flex-[999_1_460px] flex-col gap-4 rounded-[18px] border border-line bg-surface px-6 py-[22px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-lg font-extrabold">Aktivitas per jam, hari ini</h2>
            <span className="text-[13px] text-muted">kiriman, semua sesi</span>
          </div>
          {hours && hours.length > 0 ? (
            <HourlyChart buckets={hours} />
          ) : (
            <span className="text-sm text-muted">Belum ada aktivitas hari ini.</span>
          )}
        </section>
        <section className="flex min-w-0 flex-[1_1_300px] flex-col gap-3.5 rounded-[18px] border border-line bg-surface px-6 py-[22px]">
          <h2 className="m-0 text-lg font-extrabold">Top kata lintas sesi</h2>
          <TopWords words={stats.top} labelWidth={92} />
        </section>
      </div>

      <section className="overflow-hidden rounded-[18px] border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-[22px] py-[18px]">
          <h2 className="m-0 text-lg font-extrabold">Sesi</h2>
          <div role="group" aria-label="Filter sesi" className="flex gap-1.5">
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
        <div className="overflow-x-auto">
          <div role="table" aria-label="Daftar sesi" className="min-w-[900px] text-sm">
            <div
              role="row"
              className="grid items-center gap-3 border-t border-line px-[22px] py-2.5 text-[13px] font-bold text-muted"
              style={{ gridTemplateColumns: "minmax(150px, 1.5fr) 100px 100px 100px 60px 160px 250px" }}
            >
              <span role="columnheader">Nama</span>
              <span role="columnheader">Kode</span>
              <span role="columnheader">Status</span>
              <span role="columnheader">Moderasi</span>
              <span role="columnheader" className="text-right">
                Kata
              </span>
              <span role="columnheader">Dibuat</span>
              <span role="columnheader" className="text-right">
                Aksi
              </span>
            </div>
            {visible.length === 0 ? <div className="border-t border-line px-[22px] py-5 text-muted">Belum ada sesi.</div> : null}
            {visible.map((session) => (
              <SessionRow key={session.id} session={session} onResetPin={resetPin} resetting={resettingId === session.id} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
