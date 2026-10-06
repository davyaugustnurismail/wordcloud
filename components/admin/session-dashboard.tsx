"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { clockLabel, fillBuckets, peakOf } from "@/lib/chart";
import { downloadSessionPng } from "@/lib/png-download";
import type { SessionStats } from "@/lib/stats";
import { AlertCircleIcon, DownloadIcon, SpinnerIcon } from "../icons";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { useAdmin } from "./admin-provider";
import { FiveMinuteChart, TopWords } from "./charts";
import { PhotowallPreview } from "./photowall-preview";

const STEP_MS = 5 * 60 * 1000;
const WINDOW_SIZE = 28;
const REFRESH_DEBOUNCE_MS = 1200;
const REFRESH_INTERVAL_MS = 30_000;

function Tile({ label, value, note }: { label: string; value: number; note: string }) {
  return (
    <div className="flex flex-col gap-1.5 rounded-2xl border border-line bg-surface px-5 py-[18px]">
      <span className="text-sm font-semibold text-muted">{label}</span>
      <span className="text-4xl font-extrabold tabular-nums">{value}</span>
      <span className="text-[13px] text-muted">{note}</span>
    </div>
  );
}

function DownloadLink({ href, label }: { href: string; label: string }) {
  return (
    <a
      href={href}
      download
      aria-label={label}
      className="flex h-11 items-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-fg"
    >
      <DownloadIcon size={18} strokeWidth={2.2} />
      Unduh
    </a>
  );
}

export function SessionDashboard() {
  const { code, entries, presence, settings, state, actions, connected } = useAdmin();
  const [stats, setStats] = useState<SessionStats | null>(null);
  const [now, setNow] = useState<number | null>(null);
  const [pngBusy, setPngBusy] = useState(false);
  const [pngError, setPngError] = useState<string | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [ending, setEnding] = useState(false);
  const toast = useToast();

  const loadStats = useCallback(async () => {
    try {
      const response = await fetch(`/api/sessions/${code}/stats`, { cache: "no-store" });
      if (response.ok) setStats((await response.json()) as SessionStats);
    } catch {
      return;
    }
  }, [code]);

  useEffect(() => {
    setNow(Date.now());
    void loadStats();
    const timer = setInterval(() => {
      setNow(Date.now());
      void loadStats();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [loadStats]);

  useEffect(() => {
    const timer = setTimeout(() => void loadStats(), REFRESH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [entries, loadStats]);

  const visible = useMemo(
    () =>
      entries
        .filter(
          (entry) =>
            entry.status === "visible" && (state.clearedAt === null || (entry.shownAt ?? 0) > state.clearedAt),
        )
        .map((entry) => ({ id: entry.id, text: entry.text })),
    [entries, state.clearedAt],
  );

  const chart = useMemo(() => {
    if (now === null) return null;
    const buckets = stats?.buckets ?? [];
    const last = buckets.at(-1)?.start ?? null;
    const current = Math.floor(now / STEP_MS) * STEP_MS;
    const end = state.ended && last !== null ? last : Math.max(current, last ?? current);
    const filled = fillBuckets(buckets, STEP_MS, end, WINDOW_SIZE);
    return { filled, peak: peakOf(filled) };
  }, [stats, now, state.ended]);

  const peakText = chart?.peak
    ? `Puncak ${chart.peak.count} kiriman pukul ${clockLabel(chart.peak.start)}`
    : "Belum ada kiriman";

  const downloadPng = async () => {
    setPngBusy(true);
    setPngError(null);
    try {
      await downloadSessionPng(code);
    } catch {
      setPngError("PNG gagal dibuat. Coba lagi.");
    } finally {
      setPngBusy(false);
    }
  };

  const end = async () => {
    setEnding(true);
    const ack = await actions.control("end");
    setEnding(false);
    setConfirmEnd(false);
    if (ack.ok) toast.success("Sesi diakhiri. Data tetap bisa diunduh.");
    else toast.error("Sesi gagal diakhiri. Periksa koneksi lalu coba lagi.");
  };

  const modeNote = settings.moderationMode === "approve" ? "mode Approve aktif" : "mode Langsung aktif";

  return (
    <main className="flex flex-1 flex-col gap-5 px-4 py-4 md:px-8 md:pb-12 md:pt-6">
      <section aria-label="Ringkasan" className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3.5">
        <Tile
          label="Total kiriman"
          value={stats?.total ?? 0}
          note={stats?.firstAt ? `sejak ${clockLabel(stats.firstAt)}` : "belum ada kiriman"}
        />
        <Tile label="Kata unik" value={stats?.unique ?? 0} note="dibandingkan setelah huruf kecil" />
        <Tile label="Menunggu approve" value={stats?.pending ?? 0} note={modeNote} />
        <Tile
          label="Device terhubung"
          value={presence.display + presence.input + presence.admin}
          note={`photowall ${presence.display} · input ${presence.input} · admin ${presence.admin}`}
        />
      </section>

      <div className="flex flex-wrap items-stretch gap-5">
        <section className="flex min-w-0 flex-[999_1_620px] flex-col gap-4 rounded-[18px] border border-line bg-surface px-6 py-[22px]">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="m-0 text-lg font-extrabold">Kiriman per 5 menit</h2>
            <span className="text-[13px] text-muted">{peakText}</span>
          </div>
          {chart ? <FiveMinuteChart buckets={chart.filled} peakText={peakText} /> : <div className="min-h-[244px]" />}
        </section>
        <section className="flex min-w-0 flex-[1_1_340px] flex-col gap-3.5 rounded-[18px] border border-line bg-surface px-6 py-[22px]">
          <div className="flex items-baseline justify-between">
            <h2 className="m-0 text-lg font-extrabold">Top kata</h2>
            <span className="text-[13px] text-muted">jumlah kiriman</span>
          </div>
          <TopWords words={stats?.top ?? []} labelWidth={96} />
        </section>
      </div>

      <section id="unduh" className="flex scroll-mt-4 flex-col gap-[18px] rounded-[18px] border border-line bg-surface px-6 py-[22px]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="m-0 text-lg font-extrabold">Hasil &amp; unduh</h2>
            <span className="text-sm text-muted">Bisa diunduh kapan saja, termasuk setelah sesi berakhir.</span>
          </div>
          {state.ended ? (
            <span className="flex h-11 items-center rounded-xl bg-surface2 px-4 text-sm font-bold text-muted">
              Sesi sudah berakhir
            </span>
          ) : (
            <button
              type="button"
              disabled={!connected}
              onClick={() => setConfirmEnd(true)}
              className="h-11 rounded-xl border border-danger bg-transparent px-4 text-sm font-bold text-danger disabled:opacity-50"
            >
              Akhiri sesi
            </button>
          )}
        </div>

        <ConfirmDialog
          open={confirmEnd}
          title="Akhiri sesi sekarang?"
          description="Device input berhenti menerima kata untuk selamanya. Data tetap tersimpan dan bisa diunduh."
          confirmLabel="Ya, akhiri"
          tone="danger"
          busy={ending}
          onConfirm={end}
          onCancel={() => setConfirmEnd(false)}
        />

        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-0 flex-[999_1_520px] flex-wrap items-center gap-5 rounded-[14px] bg-surface2 p-4">
            <div className="w-[320px] max-w-full shrink-0">
              <PhotowallPreview entries={visible} settings={settings} animate={false} />
            </div>
            <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2.5">
              <span className="text-base font-extrabold">PNG wordcloud akhir</span>
              <span className="text-sm leading-normal text-muted">
                3840 × 2160 px. Dirender ulang dengan mesin layout yang sama, jadi identik dengan layar.
              </span>
              <button
                type="button"
                disabled={pngBusy}
                onClick={downloadPng}
                className="flex h-12 items-center gap-2 self-start rounded-xl border-0 bg-primary px-[18px] text-[15px] font-extrabold text-on-primary disabled:opacity-60"
              >
                {pngBusy ? <SpinnerIcon size={18} /> : <DownloadIcon size={18} strokeWidth={2.2} />}
                {pngBusy ? "Membuat PNG…" : "Unduh PNG"}
              </button>
              {pngError ? (
                <span role="alert" className="flex items-center gap-1.5 text-[13px] font-bold text-danger">
                  <AlertCircleIcon size={16} />
                  {pngError}
                </span>
              ) : null}
            </div>
          </div>
          <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-3">
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface2 p-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-extrabold">CSV</span>
                <span className="text-[13px] text-muted">Semua kiriman, status, waktu, device</span>
              </div>
              <DownloadLink href={`/api/sessions/${code}/export?format=csv`} label="Unduh CSV" />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface2 p-4">
              <div className="flex flex-col gap-0.5">
                <span className="text-base font-extrabold">JSON</span>
                <span className="text-[13px] text-muted">Data lengkap plus pengaturan sesi</span>
              </div>
              <DownloadLink href={`/api/sessions/${code}/export?format=json`} label="Unduh JSON" />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
