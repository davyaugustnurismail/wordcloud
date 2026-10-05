"use client";

import { useMemo } from "react";
import { formatClock } from "@/lib/format";
import { themeLabel } from "./theme-label";
import { useAdmin } from "./admin-provider";
import { PhotowallPreview } from "./photowall-preview";

export function LivePreview() {
  const { entries, settings, state } = useAdmin();

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

  const newest = useMemo(
    () =>
      entries.find(
        (entry) =>
          entry.status === "visible" && (state.clearedAt === null || (entry.shownAt ?? 0) > state.clearedAt),
      ),
    [entries, state.clearedAt],
  );

  return (
    <section className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-[18px]">
      <div className="flex items-center justify-between">
        <span className="text-[17px] font-extrabold">Preview photowall</span>
        <span className="text-[13px] font-semibold text-muted">Tema {themeLabel(settings.photowallTheme)}</span>
      </div>
      <PhotowallPreview entries={visible} settings={settings} />
      <div className="flex items-center justify-between gap-3 text-[13px] text-muted">
        <span className="min-w-0 truncate">
          Di tengah sekarang: <b className="text-fg">{newest ? newest.text : "—"}</b>
        </span>
        <span className="shrink-0">{newest ? formatClock(newest.shownAt ?? newest.createdAt) : ""}</span>
      </div>
    </section>
  );
}
