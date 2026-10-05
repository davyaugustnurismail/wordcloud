"use client";

import { useMemo, useState, type ReactNode } from "react";
import type { AdminAck } from "@/lib/realtime/events";
import { AlertCircleIcon, CheckIcon, FreezeIcon, PauseIcon, PlayIcon, TrashIcon } from "../icons";
import { useAdmin } from "./admin-provider";
import { failureMessage } from "./feedback";
import { FeedPanel } from "./feed-panel";
import { LivePreview } from "./live-preview";
import { PendingPanel } from "./pending-panel";
import { StatTiles } from "./stat-tiles";

function Banner({ tone, icon, children }: { tone: string; icon: ReactNode; children: ReactNode }) {
  return (
    <div role="status" className={`flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-bold ${tone}`}>
      {icon}
      {children}
    </div>
  );
}

function ControlButton({
  onClick,
  disabled,
  active,
  tone,
  children,
}: {
  onClick: () => void;
  disabled: boolean;
  active?: boolean;
  tone: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`flex h-11 items-center gap-2 rounded-xl border px-4 text-sm font-bold disabled:opacity-50 ${tone}`}
    >
      {children}
    </button>
  );
}

export function LiveModeration() {
  const { settings, state, connected, ready, entries, actions, setClearConfirm } = useAdmin();
  const [notice, setNotice] = useState<string | null>(null);

  const approveMode = settings.moderationMode === "approve";
  const pending = useMemo(
    () => entries.filter((entry) => entry.status === "pending").sort((a, b) => b.createdAt - a.createdAt),
    [entries],
  );
  const shownSinceClear = useMemo(
    () =>
      entries.some(
        (entry) =>
          entry.status === "visible" && (state.clearedAt === null || (entry.shownAt ?? 0) > state.clearedAt),
      ),
    [entries, state.clearedAt],
  );

  const report = (ack: AdminAck) => setNotice(failureMessage(ack));

  const modes = [
    { id: "langsung", label: "Langsung" },
    { id: "approve", label: "Approve" },
  ] as const;

  return (
    <main className="flex flex-1 flex-col gap-3.5 px-4 py-3.5 md:gap-5 md:px-8 md:pb-12 md:pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3.5">
        <div className="flex w-full items-center gap-3 md:w-auto">
          <span className="hidden text-sm font-bold text-muted md:inline">Moderasi</span>
          <div role="group" aria-label="Mode moderasi" className="flex w-full rounded-[14px] bg-surface2 p-1 md:w-auto">
            {modes.map((mode) => {
              const active = settings.moderationMode === mode.id;
              return (
                <button
                  key={mode.id}
                  type="button"
                  disabled={!connected}
                  aria-pressed={active}
                  onClick={async () => report(await actions.setMode(mode.id))}
                  className={`h-11 flex-1 rounded-[10px] px-[18px] text-[15px] font-extrabold md:h-10 md:flex-none md:text-sm disabled:opacity-60 ${
                    active ? "bg-primary text-on-primary" : "bg-transparent text-fg"
                  }`}
                >
                  {mode.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="hidden items-center gap-2.5 md:flex">
          <ControlButton
            disabled={!connected}
            active={state.paused}
            onClick={() => actions.control(state.paused ? "resume" : "pause")}
            tone={state.paused ? "border-warn bg-warn/15 text-warn" : "border-line bg-transparent text-fg"}
          >
            {state.paused ? <PlayIcon size={18} strokeWidth={2.2} /> : <PauseIcon size={18} strokeWidth={2.2} />}
            {state.paused ? "Lanjutkan input" : "Pause input"}
          </ControlButton>
          <ControlButton
            disabled={!connected}
            active={state.frozen}
            onClick={() => actions.control(state.frozen ? "unfreeze" : "freeze")}
            tone={state.frozen ? "border-info bg-info/15 text-info" : "border-line bg-transparent text-fg"}
          >
            <FreezeIcon size={18} />
            {state.frozen ? "Cairkan tampilan" : "Freeze tampilan"}
          </ControlButton>
          <ControlButton
            disabled={!connected}
            onClick={() => setClearConfirm(true)}
            tone="border-danger bg-transparent text-danger"
          >
            <TrashIcon size={18} />
            Clear
          </ControlButton>
        </div>
      </div>

      {notice ? (
        <Banner tone="bg-danger/10 text-danger" icon={<AlertCircleIcon size={18} />}>
          {notice}
        </Banner>
      ) : null}
      {state.paused ? (
        <Banner tone="bg-warn/15 text-warn" icon={<PauseIcon size={18} strokeWidth={2.2} />}>
          Input dijeda. Device input menampilkan pesan tunggu, kata tidak bisa dikirim.
        </Banner>
      ) : null}
      {state.frozen ? (
        <Banner tone="bg-info/15 text-info" icon={<FreezeIcon size={18} />}>
          Tampilan photowall dibekukan. Kata baru tetap masuk dan tersimpan.
        </Banner>
      ) : null}
      {state.clearedAt !== null && !shownSinceClear && ready ? (
        <Banner tone="bg-surface2 text-fg" icon={<CheckIcon size={18} strokeWidth={2.4} />}>
          Photowall sudah di-clear. Kata berikutnya mulai dari tengah lagi.
        </Banner>
      ) : null}

      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-3.5 md:gap-5">
          {approveMode || pending.length > 0 ? <PendingPanel pending={pending} report={report} /> : null}
          <FeedPanel report={report} />
        </div>
        <aside className="hidden min-w-0 flex-[1_1_400px] flex-col gap-5 md:flex">
          <LivePreview />
          <StatTiles />
        </aside>
      </div>
    </main>
  );
}
