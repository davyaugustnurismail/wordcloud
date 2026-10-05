"use client";

import { clockLabel, type Bucket } from "@/lib/chart";

const AXIS_STEPS = 3;

export function FiveMinuteChart({ buckets, peakText }: { buckets: Bucket[]; peakText: string }) {
  const max = Math.max(0, ...buckets.map((bucket) => bucket.count));
  const top = Math.max(AXIS_STEPS, Math.ceil(max / AXIS_STEPS) * AXIS_STEPS);
  const ticks = Array.from({ length: AXIS_STEPS + 1 }, (_, index) => (top / AXIS_STEPS) * (AXIS_STEPS - index));
  const labelCount = Math.min(6, buckets.length);
  const labels = Array.from({ length: labelCount }, (_, index) => {
    const bucket = buckets[Math.round((index * (buckets.length - 1)) / Math.max(1, labelCount - 1))];
    return bucket ? clockLabel(bucket.start) : "";
  });

  return (
    <div role="img" aria-label={`Grafik batang kiriman per 5 menit. ${peakText}`} className="flex gap-2.5">
      <div className="relative h-[220px] w-6 text-xs tabular-nums text-muted">
        {ticks.map((tick, index) => (
          <span
            key={tick}
            className="absolute right-0"
            style={{ top: `calc(${(index / AXIS_STEPS) * 100}% - ${index === 0 ? 8 : index === AXIS_STEPS ? 8 : 8}px)` }}
          >
            {tick}
          </span>
        ))}
      </div>
      <div className="flex min-w-0 grow flex-col gap-2">
        <div className="relative h-[220px]">
          {ticks.slice(0, -1).map((tick, index) => (
            <div
              key={tick}
              className="absolute inset-x-0 h-px bg-line"
              style={{ top: `${(index / AXIS_STEPS) * 100}%` }}
            />
          ))}
          <div className="absolute inset-x-0 bottom-0 h-px bg-line-strong" />
          <div className="absolute inset-0 flex items-end gap-1">
            {buckets.map((bucket) => (
              <div
                key={bucket.start}
                title={`${clockLabel(bucket.start)} · ${bucket.count} kiriman`}
                className="min-w-0 flex-1 rounded-t bg-primary"
                style={{ height: `${(bucket.count / top) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div className="flex justify-between text-xs tabular-nums text-muted">
          {labels.map((label, index) => (
            <span key={index}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function HourlyChart({ buckets }: { buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((bucket) => bucket.count));
  const description = buckets.map((bucket) => `${clockLabel(bucket.start)} ${bucket.count}`).join(", ");

  return (
    <>
      <div
        role="img"
        aria-label={`Kiriman per jam hari ini: ${description}`}
        className="box-border flex h-[210px] items-end gap-3.5 border-b border-line-strong pt-[22px]"
      >
        {buckets.map((bucket) => (
          <div key={bucket.start} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1.5">
            <span className="text-[13px] font-bold tabular-nums">{bucket.count}</span>
            <div
              className="w-full max-w-16 rounded-t-md bg-primary"
              style={{ height: `${(bucket.count / max) * 88}%` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-3.5 text-xs tabular-nums text-muted">
        {buckets.map((bucket) => (
          <span key={bucket.start} className="min-w-0 flex-1 text-center">
            {clockLabel(bucket.start)}
          </span>
        ))}
      </div>
    </>
  );
}

export function TopWords({ words, labelWidth }: { words: { word: string; count: number }[]; labelWidth: number }) {
  const max = Math.max(1, ...words.map((item) => item.count));
  if (words.length === 0) return <span className="text-sm text-muted">Belum ada kata.</span>;

  return (
    <div className="flex flex-col gap-2.5">
      {words.map((item) => (
        <div
          key={item.word}
          className="grid items-center gap-2.5"
          style={{ gridTemplateColumns: `${labelWidth}px minmax(0, 1fr) 32px` }}
        >
          <span className="truncate text-[15px] font-bold">{item.word}</span>
          <span className="block h-3.5 rounded bg-surface2">
            <span className="block h-full rounded bg-primary" style={{ width: `${(item.count / max) * 100}%` }} />
          </span>
          <span className="text-right text-sm font-bold tabular-nums">{item.count}</span>
        </div>
      ))}
    </div>
  );
}
