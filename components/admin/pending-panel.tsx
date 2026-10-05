"use client";

import { formatClock } from "@/lib/format";
import type { AdminAck, AdminEntryDto } from "@/lib/realtime/events";
import { CheckIcon, XIcon } from "../icons";
import { useAdmin } from "./admin-provider";

type Props = {
  pending: AdminEntryDto[];
  report: (ack: AdminAck) => void;
};

export function PendingPanel({ pending, report }: Props) {
  const { actions, deviceLabels, connected } = useAdmin();

  const approve = async (ids: string[]) => report(await actions.approve(ids));
  const reject = async (id: string) => report(await actions.reject(id));

  return (
    <section aria-label="Menunggu approve" className="overflow-hidden rounded-2xl border-2 border-warn bg-surface md:rounded-[18px]">
      <div className="flex items-center justify-between gap-3 bg-warn/15 px-3.5 py-3 md:px-5 md:py-4">
        <div className="flex items-center gap-2.5 md:gap-3">
          <span className="flex h-9 min-w-9 items-center justify-center rounded-[10px] bg-warn px-2 text-xl font-extrabold text-on-warn md:h-11 md:min-w-11 md:rounded-xl md:px-2.5 md:text-2xl">
            {pending.length}
          </span>
          <div className="flex flex-col">
            <span className="text-[15px] font-extrabold md:text-[17px]">Menunggu approve</span>
            <span className="hidden text-[13px] text-muted md:block">Kata baru tidak tampil sebelum disetujui.</span>
          </div>
        </div>
        <button
          type="button"
          disabled={!connected || pending.length === 0}
          onClick={() => approve(pending.map((entry) => entry.id))}
          className="flex h-10 items-center gap-2 rounded-[10px] bg-primary px-3 text-[13px] font-extrabold text-on-primary disabled:opacity-50 md:h-11 md:rounded-xl md:px-4 md:text-sm"
        >
          <CheckIcon size={18} strokeWidth={2.6} className="hidden md:block" />
          Setujui semua
        </button>
      </div>
      {pending.length === 0 ? <div className="p-5 text-sm text-muted">Tidak ada kata yang menunggu.</div> : null}
      {pending.map((entry) => (
        <div
          key={entry.id}
          className="flex items-center justify-between gap-3 border-t border-line px-3.5 py-2.5 md:px-5 md:py-3"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-xl font-extrabold md:text-[22px]">{entry.text}</span>
            <span className="text-xs text-muted md:text-[13px]">
              {formatClock(entry.createdAt)} · {(entry.deviceId && deviceLabels.get(entry.deviceId)) || "—"}
            </span>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={!connected}
              onClick={() => reject(entry.id)}
              aria-label={`Tolak kata ${entry.text}`}
              className="flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl border border-line bg-transparent text-sm font-bold text-fg disabled:opacity-50 md:h-11 md:w-auto md:px-3.5"
            >
              <XIcon size={18} strokeWidth={2.4} />
              <span className="hidden md:inline">Tolak</span>
            </button>
            <button
              type="button"
              disabled={!connected}
              onClick={() => approve([entry.id])}
              aria-label={`Setujui kata ${entry.text}`}
              className="flex h-12 w-12 items-center justify-center gap-1.5 rounded-xl bg-live text-sm font-extrabold text-on-live disabled:opacity-50 md:h-11 md:w-auto md:px-4"
            >
              <CheckIcon size={18} strokeWidth={2.8} />
              <span className="hidden md:inline">Setujui</span>
            </button>
          </div>
        </div>
      ))}
    </section>
  );
}
