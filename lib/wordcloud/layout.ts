export type InkMetrics = {
  l: number;
  r: number;
  a: number;
  d: number;
  fa: number;
  fd: number;
};

export type LayoutWord = {
  id: string;
  text: string;
  metrics: InkMetrics;
};

export type LayoutParams = {
  width: number;
  height: number;
  k: number;
  minRatio: number;
  safePct: number;
  maxPct: number;
};

export type PlacedWord = {
  id: string;
  text: string;
  rank: number;
  fs: number;
  x: number;
  y: number;
  lh: number;
};

export type LayoutResult = {
  placed: PlacedWord[];
  scale: number;
};

type Box = { x0: number; y0: number; x1: number; y1: number };
type Slot = PlacedWord | null;
type Fit = { scale: number; placed: Slot[] };

const GRID_WIDTH = 560;
const METRIC_BASE_SIZE = 100;
const COLD_BISECTIONS = 5;
const WARM_BISECTIONS = 2;
const WARM_STEP_UP = 1.03;
const WARM_STEP_DOWN = 0.97;
const WARM_SHRINK = 0.9;

export function hash32(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function hash01(value: string): number {
  return hash32(value) / 4294967296;
}

function isFree(grid: Uint8Array, gridWidth: number, cell: number, x: number, y: number, w: number, h: number): boolean {
  const x0 = Math.floor(x / cell);
  const y0 = Math.floor(y / cell);
  const x1 = Math.ceil((x + w) / cell);
  const y1 = Math.ceil((y + h) / cell);
  const mid = (y0 + y1) >> 1;

  let row = mid * gridWidth;
  for (let xx = x0; xx < x1; xx++) if (grid[row + xx]) return false;
  for (let yy = y0; yy < y1; yy++) {
    row = yy * gridWidth;
    if (grid[row + x0] || grid[row + x1 - 1]) return false;
  }
  for (let yy = y0; yy < y1; yy++) {
    row = yy * gridWidth;
    for (let xx = x0; xx < x1; xx++) if (grid[row + xx]) return false;
  }
  return true;
}

function mark(grid: Uint8Array, gridWidth: number, cell: number, x: number, y: number, w: number, h: number) {
  const x0 = Math.floor(x / cell);
  const y0 = Math.floor(y / cell);
  const x1 = Math.ceil((x + w) / cell);
  const y1 = Math.ceil((y + h) / cell);
  for (let yy = y0; yy < y1; yy++) {
    const row = yy * gridWidth;
    for (let xx = x0; xx < x1; xx++) grid[row + xx] = 1;
  }
}

function fitsBox(x: number, y: number, w: number, h: number, box: Box): boolean {
  return x >= box.x0 && y >= box.y0 && x + w <= box.x1 && y + h <= box.y1;
}

function findPosition(
  grid: Uint8Array,
  gridWidth: number,
  cell: number,
  unit: number,
  bw: number,
  bh: number,
  cx: number,
  cy: number,
  box: Box,
  offset: number,
): [number, number] | null {
  const aspect = (box.x1 - box.x0) / (box.y1 - box.y0);
  const gap = Math.max(2 * unit, Math.min(10 * unit, bh * 0.45));
  const step = Math.max(2 * unit, Math.min(8 * unit, bh * 0.3));
  const maxRadius = (box.y1 - box.y0) / 2 + bh;

  let x = cx - bw / 2;
  let y = cy - bh / 2;
  if (fitsBox(x, y, bw, bh, box) && isFree(grid, gridWidth, cell, x, y, bw, bh)) return [x, y];

  for (let r = gap; r <= maxRadius; r += gap) {
    const hx = aspect * r;
    const hy = r;
    const perimeter = 4 * (hx + hy);
    const n = Math.max(8, Math.ceil(perimeter / step));
    for (let k = 0; k < n; k++) {
      let t = ((k / n + offset) % 1) * perimeter;
      let px: number;
      let py: number;
      if (t < 2 * hx) {
        px = -hx + t;
        py = -hy;
      } else if ((t -= 2 * hx) < 2 * hy) {
        px = hx;
        py = -hy + t;
      } else if ((t -= 2 * hy) < 2 * hx) {
        px = hx - t;
        py = hy;
      } else {
        t -= 2 * hx;
        px = -hx;
        py = hy - t;
      }
      x = cx + px - bw / 2;
      y = cy + py - bh / 2;
      if (fitsBox(x, y, bw, bh, box) && isFree(grid, gridWidth, cell, x, y, bw, bh)) return [x, y];
    }
  }
  return null;
}

export function computeLayout(
  words: readonly LayoutWord[],
  params: LayoutParams,
  scaleHint?: number,
): LayoutResult {
  const count = words.length;
  const first = words[0];
  if (!first || params.width <= 0 || params.height <= 0) return { placed: [], scale: 0 };

  const { width: W, height: H, k, minRatio, safePct, maxPct } = params;
  const unit = W / 1280;
  const cell = W / GRID_WIDTH;
  const gridHeight = Math.ceil(H / cell) + 2;
  const grid = new Uint8Array(GRID_WIDTH * gridHeight);
  const marginX = (W * safePct) / 100;
  const marginY = (H * safePct) / 100;
  const box: Box = { x0: marginX, y0: marginY, x1: W - marginX, y1: H - marginY };
  const cx = W / 2;
  const cy = H / 2;

  const ratios = words.map((_, i) => minRatio + (1 - minRatio) * Math.exp(-i / k));
  const offsets = words.map((word) => hash01(word.id));
  const firstWidth = (first.metrics.l + first.metrics.r) / METRIC_BASE_SIZE;
  const floor = H * 0.02;

  const attempt = (scale: number, allowDrop: boolean): Slot[] | null => {
    grid.fill(0);
    const placed: Slot[] = [];
    for (let j = 0; j < count; j++) {
      const word = words[j];
      if (!word) continue;
      const fs = Math.max(scale * (ratios[j] ?? minRatio), floor);
      const m = word.metrics;
      const sc = fs / METRIC_BASE_SIZE;
      const pad = fs * 0.03 + 0.5 * unit;
      const bw = (m.l + m.r) * sc + pad * 2;
      const bh = (m.a + m.d) * sc + pad * 2;
      const pos = findPosition(grid, GRID_WIDTH, cell, unit, bw, bh, cx, cy, box, offsets[j] ?? 0);
      if (!pos) {
        if (!allowDrop) return null;
        placed.push(null);
        continue;
      }
      mark(grid, GRID_WIDTH, cell, pos[0], pos[1], bw, bh);
      placed.push({
        id: word.id,
        text: word.text,
        rank: j,
        fs,
        x: pos[0] + pad + m.l * sc,
        y: pos[1] + pad + m.a * sc - m.fa * sc,
        lh: (m.fa + m.fd) * sc,
      });
    }
    return placed;
  };

  const maxScale = Math.min((H * maxPct) / 100, (0.96 * (box.x1 - box.x0)) / Math.max(firstWidth, 0.1));

  const tryFit = (scale: number): Fit | null => {
    const placed = attempt(scale, false);
    return placed ? { scale, placed } : null;
  };

  const bisect = (fit: Fit, ceiling: number, rounds: number): Fit => {
    let best = fit;
    let high = ceiling;
    for (let i = 0; i < rounds; i++) {
      const mid = (best.scale + high) / 2;
      const result = tryFit(mid);
      if (result) best = result;
      else high = mid;
    }
    return best;
  };

  const descend = (start: number, ceiling: number, shrink: number, rounds: number): Fit => {
    let high = ceiling;
    let low = start;
    let fit = tryFit(low);
    while (!fit && low * minRatio * 0.75 >= floor) {
      high = low;
      low *= shrink;
      fit = tryFit(low);
    }
    if (!fit) {
      const dense = Math.min(low, floor / minRatio);
      return { scale: dense, placed: attempt(dense, true) ?? [] };
    }
    return bisect(fit, high, rounds);
  };

  const searchCold = (): Fit => {
    const top = tryFit(maxScale);
    if (top) return top;
    return descend(maxScale * 0.7, maxScale, 0.75, COLD_BISECTIONS);
  };

  const searchWarm = (hint: number): Fit => {
    const start = Math.min(hint, maxScale);
    const fit = tryFit(start);
    if (!fit) return descend(start * WARM_STEP_DOWN, start, WARM_SHRINK, WARM_BISECTIONS);
    if (start >= maxScale) return fit;

    const probeScale = Math.min(start * WARM_STEP_UP, maxScale);
    const probe = tryFit(probeScale);
    if (!probe) return bisect(fit, probeScale, WARM_BISECTIONS);
    if (probeScale >= maxScale) return probe;

    const top = tryFit(maxScale);
    return top ?? bisect(probe, maxScale, COLD_BISECTIONS);
  };

  const result = scaleHint && scaleHint > 0 ? searchWarm(scaleHint) : searchCold();
  return {
    placed: result.placed.filter((word): word is PlacedWord => word !== null),
    scale: result.scale,
  };
}
