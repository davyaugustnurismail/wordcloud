import type { InkMetrics } from "./layout";

const FONT_FAMILY = '"Baloo 2", "Trebuchet MS", sans-serif';
const FONT_SPEC = `800 100px ${FONT_FAMILY}`;

const cache = new Map<string, InkMetrics>();
let context: CanvasRenderingContext2D | null = null;

export const WORD_FONT_FAMILY = `var(--font-baloo), ${FONT_FAMILY}`;

export function measureInk(text: string): InkMetrics {
  const hit = cache.get(text);
  if (hit) return hit;

  if (!context) {
    context = document.createElement("canvas").getContext("2d");
  }
  if (!context) {
    return { l: 0, r: text.length * 55, a: 72, d: 18, fa: 110, fd: 52 };
  }

  context.font = FONT_SPEC;
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const m = context.measureText(text);
  const metrics: InkMetrics = {
    l: m.actualBoundingBoxLeft ?? 0,
    r: m.actualBoundingBoxRight ?? m.width,
    a: m.actualBoundingBoxAscent ?? 72,
    d: m.actualBoundingBoxDescent ?? 18,
    fa: m.fontBoundingBoxAscent || 110,
    fd: m.fontBoundingBoxDescent || 52,
  };
  cache.set(text, metrics);
  return metrics;
}

export async function loadWordFont(): Promise<void> {
  try {
    await document.fonts.load(FONT_SPEC, "abcdefghijklmnopqrstuvwxyz0123456789-");
  } catch {
    return;
  } finally {
    cache.clear();
  }
}
