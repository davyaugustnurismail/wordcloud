"use client";

import { useMemo } from "react";
import { normalizeWord } from "@/lib/words";
import { useAdmin } from "./admin-provider";

function Tile({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-2xl border border-line bg-surface p-4">
      <span className="text-[13px] font-semibold text-muted">{label}</span>
      <span className={`text-[30px] font-extrabold tabular-nums ${tone ?? ""}`}>{value}</span>
    </div>
  );
}

export function StatTiles() {
  const { entries, presence } = useAdmin();

  const stats = useMemo(() => {
    const unique = new Set<string>();
    let pending = 0;
    for (const entry of entries) {
      unique.add(normalizeWord(entry.text));
      if (entry.status === "pending") pending++;
    }
    return { total: entries.length, unique: unique.size, pending };
  }, [entries]);

  return (
    <section className="grid grid-cols-2 gap-3">
      <Tile label="Total kiriman" value={stats.total} />
      <Tile label="Kata unik" value={stats.unique} />
      <Tile label="Menunggu approve" value={stats.pending} tone={stats.pending > 0 ? "text-warn" : undefined} />
      <Tile label="Device terhubung" value={presence.display + presence.input + presence.admin} />
    </section>
  );
}
