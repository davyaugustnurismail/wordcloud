const KEY = Symbol.for("wordcloud.metrics");
const WINDOW = 1000;

type Series = { values: number[]; total: number };
type Holder = typeof globalThis & { [KEY]?: Map<string, Series> };

export type MetricSummary = { count: number; p50: number; p95: number; max: number };

function store(): Map<string, Series> {
  const holder = globalThis as Holder;
  const existing = holder[KEY];
  if (existing) return existing;
  const created = new Map<string, Series>();
  holder[KEY] = created;
  return created;
}

export function recordDuration(name: string, ms: number): void {
  const metrics = store();
  const series = metrics.get(name) ?? { values: [], total: 0 };
  series.values.push(ms);
  if (series.values.length > WINDOW) series.values.shift();
  series.total++;
  metrics.set(name, series);
}

export async function measure<T>(name: string, work: () => Promise<T>): Promise<T> {
  const startedAt = performance.now();
  try {
    return await work();
  } finally {
    recordDuration(name, performance.now() - startedAt);
  }
}

function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}

export function summarizeMetrics(): Record<string, MetricSummary> {
  const result: Record<string, MetricSummary> = {};
  for (const [name, series] of store()) {
    const sorted = [...series.values].sort((a, b) => a - b);
    result[name] = {
      count: series.total,
      p50: Math.round(percentile(sorted, 50) * 10) / 10,
      p95: Math.round(percentile(sorted, 95) * 10) / 10,
      max: Math.round((sorted.at(-1) ?? 0) * 10) / 10,
    };
  }
  return result;
}
