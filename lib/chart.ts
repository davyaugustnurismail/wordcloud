export type Bucket = { start: number; count: number };

export function fillBuckets(buckets: readonly Bucket[], stepMs: number, end: number, size: number): Bucket[] {
  const counts = new Map(buckets.map((bucket) => [bucket.start, bucket.count]));
  const first = end - (size - 1) * stepMs;
  return Array.from({ length: size }, (_, index) => {
    const start = first + index * stepMs;
    return { start, count: counts.get(start) ?? 0 };
  });
}

export function niceMax(value: number, step = 5): number {
  return Math.max(step, Math.ceil(value / step) * step);
}

export function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function clockLabel(timestamp: number): string {
  const date = new Date(timestamp);
  return `${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
}

export function peakOf(buckets: readonly Bucket[]): Bucket | null {
  let peak: Bucket | null = null;
  for (const bucket of buckets) {
    if (bucket.count > 0 && (!peak || bucket.count > peak.count)) peak = bucket;
  }
  return peak;
}
