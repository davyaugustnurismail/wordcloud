"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { clockLabel, fillBuckets, type Bucket } from "@/lib/chart";
import { copyText } from "@/lib/clipboard";
import { downloadSessionPng } from "@/lib/png-download";
import type { GlobalStats, SessionOverview } from "@/lib/stats";
import { HourlyChart, TopWords } from "../admin/charts";
import {
  CheckIcon,
  CopyIcon,
  DownloadIcon,
  ExternalLinkIcon,
  EyeIcon,
  EyeOffIcon,
  LinkIcon,
  RefreshIcon,
  SearchIcon,
  SpinnerIcon,
} from "../icons";
import { ActionMenu, menuItemClass } from "../ui/action-menu";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { AutoRefresh } from "./auto-refresh";

type Filter = "semua" | "aktif" | "selesai";

const HOUR_MS = 3_600_000;
const HOUR_WINDOW = 8;
const REFRESH_MS = 15_000;
const PIN_VISIBLE_MS = 20_000;
const COLUMNS = "xl:grid-cols-[minmax(200px,1.8fr)_84px_148px_84px_84px_52px_232px]";

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

type PinState = "hidden" | "loading" | "shown" | "missing" | "error";

function formatPin(pin: string): string {
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}

function PinCell({ session }: { session: SessionOverview }) {
  const toast = useToast();
  const [state, setState] = useState<PinState>("hidden");
  const [pin, setPin] = useState("");
  const [copied, setCopied] = useState(false);
  const iconButton =
    "flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-transparent text-fg disabled:opacity-60";

  useEffect(() => {
    if (state !== "shown") return;
    const timer = setTimeout(() => {
      setPin("");
      setState("hidden");
    }, PIN_VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [state]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const reveal = async () => {
    setState("loading");
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/pin`, { cache: "no-store" });
      if (!response.ok) throw new Error("pin");
      const body = (await response.json()) as { pin: string | null };
      if (body.pin) {
        setPin(body.pin);
        setState("shown");
      } else {
        setState("missing");
      }
    } catch {
      setState("error");
    }
  };

  const hide = () => {
    setPin("");
    setState("hidden");
  };

  const copyPin = async () => {
    const ok = await copyText(pin);
    setCopied(ok);
    if (ok) toast.success("PIN admin tersalin.");
    else toast.error("Tidak bisa menyalin PIN.");
  };

  if (state === "missing") {
    return (
      <span
        role="cell"
        title="Sesi ini dibuat sebelum PIN disimpan. Pakai Reset PIN untuk membuat PIN baru."
        className="text-xs leading-tight text-muted"
      >
        Tidak tersimpan. Pakai Reset PIN.
      </span>
    );
  }

  return (
    <span role="cell" className="flex items-center gap-1.5">
      <span className="min-w-[78px] font-mono font-bold tracking-[0.06em]" aria-live="polite">
        {state === "shown" ? formatPin(pin) : state === "error" ? "Gagal" : "••• •••"}
      </span>
      {state === "shown" ? (
        <>
          <button type="button" onClick={hide} aria-label={`Sembunyikan PIN sesi ${session.name}`} className={iconButton}>
            <EyeOffIcon size={16} />
          </button>
          <button type="button" onClick={copyPin} aria-label={`Salin PIN sesi ${session.name}`} className={iconButton}>
            {copied ? <CheckIcon size={16} /> : <CopyIcon size={16} />}
          </button>
        </>
      ) : (
        <button
          type="button"
          disabled={state === "loading"}
          onClick={reveal}
          aria-label={`Lihat PIN admin sesi ${session.name}`}
          className={iconButton}
        >
          {state === "loading" ? <SpinnerIcon size={16} /> : <EyeIcon size={16} />}
        </button>
      )}
    </span>
  );
}

function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 xl:contents">
      <span className="text-xs font-bold uppercase tracking-[0.06em] text-muted xl:hidden">{label}</span>
      {children}
    </span>
  );
}

function StatusChip({ active, className = "" }: { active: boolean; className?: string }) {
  return (
    <span
      className={`inline-flex h-[26px] shrink-0 items-center rounded-full px-2.5 text-xs font-extrabold ${
        active ? "bg-live/15 text-live" : "bg-fg/10 text-muted"
      } ${className}`}
    >
      {active ? "Aktif" : "Selesai"}
    </span>
  );
}

function SessionRow({
  session,
  pinVersion,
  onResetPin,
  resetting,
}: {
  session: SessionOverview;
  pinVersion: number;
  onResetPin: (session: SessionOverview) => void;
  resetting: boolean;
}) {
  const toast = useToast();
  const [pngBusy, setPngBusy] = useState(false);
  const active = session.status === "active";
  const ref = session.slug ?? session.code;

  const png = async () => {
    setPngBusy(true);
    try {
      await downloadSessionPng(session.code);
    } catch {
      toast.error("PNG gagal dibuat. Coba lagi.");
    } finally {
      setPngBusy(false);
    }
  };

  const copyInputLink = async () => {
    const ok = await copyText(`${window.location.origin}/s/${ref}/input`);
    if (ok) toast.success("Tautan input tersalin.");
    else toast.error("Tidak bisa menyalin tautan.");
  };

  return (
    <div
      role="row"
      className={`flex flex-col gap-3 border-t border-line px-4 py-4 xl:grid xl:items-center xl:gap-3 xl:px-[22px] xl:py-2.5 ${COLUMNS}`}
    >
      <span role="cell" className="flex min-w-0 flex-col gap-0.5">
        <span className="flex items-center justify-between gap-3">
          <span className="truncate text-[15px] font-extrabold">{session.name}</span>
          <StatusChip active={active} className="xl:hidden" />
        </span>
        <span className="truncate font-mono text-[13px] font-bold text-muted">/s/{ref}</span>
        <span className="text-xs text-muted" suppressHydrationWarning>
          Dibuat {formatDateTime(session.createdAt)}
        </span>
      </span>
      <MetaItem label="Kode">
        <span role="cell" className="font-mono font-bold tracking-[0.06em]">
          {session.code}
        </span>
      </MetaItem>
      <MetaItem label="PIN admin">
        <PinCell key={pinVersion} session={session} />
      </MetaItem>
      <span role="cell" className="hidden xl:block">
        <StatusChip active={active} />
      </span>
      <MetaItem label="Moderasi">
        <span role="cell">{session.moderationMode === "approve" ? "Approve" : "Langsung"}</span>
      </MetaItem>
      <MetaItem label="Kata">
        <span role="cell" className="font-bold tabular-nums xl:text-right">
          {session.entryCount}
        </span>
      </MetaItem>
      <span role="cell" className="flex items-center gap-1.5 xl:justify-end">
        <Link
          href={`/s/${ref}/admin`}
          className="flex h-10 items-center whitespace-nowrap rounded-[10px] bg-primary px-3 text-[13px] font-extrabold text-on-primary"
        >
          Buka admin
        </Link>
        <a
          href={`/s/${ref}/display`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex h-10 items-center gap-1.5 whitespace-nowrap rounded-[10px] border border-line px-3 text-[13px] font-bold text-fg"
        >
          Photowall
          <ExternalLinkIcon size={14} strokeWidth={2.2} />
        </a>
        <ActionMenu label={`Aksi lain untuk sesi ${session.name}`}>
          {(close) => (
            <>
              <button
                type="button"
                role="menuitem"
                className={menuItemClass}
                onClick={() => {
                  close();
                  void copyInputLink();
                }}
              >
                <LinkIcon size={16} />
                Salin tautan input
              </button>
              <a
                role="menuitem"
                href={`/api/sessions/${session.code}/export?format=csv`}
                download
                className={menuItemClass}
                onClick={close}
              >
                <DownloadIcon size={16} />
                Unduh CSV
              </a>
              <a
                role="menuitem"
                href={`/api/sessions/${session.code}/export?format=json`}
                download
                className={menuItemClass}
                onClick={close}
              >
                <DownloadIcon size={16} />
                Unduh JSON
              </a>
              <button
                type="button"
                role="menuitem"
                disabled={pngBusy}
                className={menuItemClass}
                onClick={() => {
                  close();
                  void png();
                }}
              >
                {pngBusy ? <SpinnerIcon size={16} /> : <DownloadIcon size={16} />}
                PNG akhir
              </button>
              <button
                type="button"
                role="menuitem"
                disabled={resetting}
                className={`${menuItemClass} text-danger`}
                onClick={() => {
                  close();
                  onResetPin(session);
                }}
              >
                <RefreshIcon size={16} />
                Reset PIN admin
              </button>
            </>
          )}
        </ActionMenu>
      </span>
    </div>
  );
}

export function GlobalDashboard({ stats, sessions }: { stats: GlobalStats; sessions: SessionOverview[] }) {
  const toast = useToast();
  const [filter, setFilter] = useState<Filter>("semua");
  const [query, setQuery] = useState("");
  const [hours, setHours] = useState<Bucket[] | null>(null);
  const [reset, setReset] = useState<{ code: string; pin: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<SessionOverview | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);
  const [pinVersions, setPinVersions] = useState<Record<string, number>>({});

  useEffect(() => {
    const dayStart = new Date();
    dayStart.setHours(0, 0, 0, 0);
    const currentHour = Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
    setHours(fillBuckets(stats.hours, HOUR_MS, currentHour, HOUR_WINDOW).filter((bucket) => bucket.start >= dayStart.getTime()));
  }, [stats.hours]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return sessions.filter((session) => {
      const matchesFilter =
        filter === "aktif" ? session.status === "active" : filter === "selesai" ? session.status === "ended" : true;
      if (!matchesFilter) return false;
      if (!needle) return true;
      return [session.name, session.code, session.slug ?? ""].some((value) => value.toLowerCase().includes(needle));
    });
  }, [sessions, filter, query]);

  const resetPin = async (session: SessionOverview) => {
    setResettingId(session.id);
    try {
      const response = await fetch(`/api/admin/sessions/${session.id}/reset-pin`, { method: "POST" });
      if (!response.ok) throw new Error("reset");
      setReset((await response.json()) as { code: string; pin: string });
      setPinVersions((current) => ({ ...current, [session.id]: (current[session.id] ?? 0) + 1 }));
      toast.success(`PIN sesi ${session.name} direset.`);
    } catch {
      toast.error("PIN gagal direset. Coba lagi.");
    } finally {
      setResettingId(null);
      setResetTarget(null);
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

      <section className="rounded-[18px] border border-line bg-surface">
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-[18px] md:px-[22px]">
          <h2 className="m-0 text-lg font-extrabold">Sesi</h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-10 min-w-[250px] items-center gap-2 rounded-full border border-line bg-field px-3.5 focus-within:border-ring">
              <SearchIcon size={16} className="shrink-0 text-muted" />
              <span className="sr-only">Cari sesi</span>
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari nama, kode"
                autoComplete="off"
                className="min-w-0 flex-1 border-0 bg-transparent text-sm text-fg focus:outline-none"
              />
            </label>
            <div role="group" aria-label="Filter sesi" className="flex gap-1.5">
              {filters.map((item) => {
                const activeFilter = item.id === filter;
                return (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={activeFilter}
                    onClick={() => setFilter(item.id)}
                    className={`h-9 rounded-full border px-3 text-[13px] font-bold ${
                      activeFilter ? "border-primary bg-primary text-on-primary" : "border-line bg-transparent text-fg"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div role="table" aria-label="Daftar sesi" className="text-sm">
          <div
            role="row"
            className={`hidden items-center gap-3 border-t border-line px-[22px] py-2.5 text-[13px] font-bold text-muted xl:grid ${COLUMNS}`}
          >
            <span role="columnheader">Sesi</span>
            <span role="columnheader">Kode</span>
            <span role="columnheader">PIN admin</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Moderasi</span>
            <span role="columnheader" className="text-right">
              Kata
            </span>
            <span role="columnheader" className="text-right">
              Aksi
            </span>
          </div>
          {visible.length === 0 ? (
            <div className="border-t border-line px-[22px] py-5 text-muted">
              {sessions.length === 0 ? "Belum ada sesi." : "Tidak ada sesi yang cocok dengan pencarian atau filter."}
            </div>
          ) : null}
          {visible.map((session) => (
            <SessionRow
              key={session.id}
              session={session}
              pinVersion={pinVersions[session.id] ?? 0}
              onResetPin={setResetTarget}
              resetting={resettingId === session.id}
            />
          ))}
        </div>
      </section>

      <ConfirmDialog
        open={resetTarget !== null}
        title="Reset PIN admin sesi?"
        description={
          <>
            PIN lama sesi <b className="text-fg">{resetTarget?.name}</b> tidak berlaku lagi dan semua admin sesi yang sedang masuk
            otomatis keluar. PIN baru akan ditampilkan di atas tabel.
          </>
        }
        confirmLabel="Ya, reset PIN"
        tone="danger"
        busy={resettingId !== null}
        onConfirm={() => resetTarget && void resetPin(resetTarget)}
        onCancel={() => setResetTarget(null)}
      />
    </main>
  );
}
