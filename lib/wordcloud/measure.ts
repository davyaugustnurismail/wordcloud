import type { PhotowallFont } from "../settings";
import { canvasFont } from "./fonts";
import type { InkMetrics } from "./layout";

const caches = new Map<PhotowallFont, Map<string, InkMetrics>>();
let context: CanvasRenderingContext2D | null = null;

function cacheFor(font: PhotowallFont): Map<string, InkMetrics> {
  let cache = caches.get(font);
  if (!cache) {
    cache = new Map();
    caches.set(font, cache);
  }
  return cache;
}

export function measureInk(text: string, font: PhotowallFont): InkMetrics {
  const cache = cacheFor(font);
  const hit = cache.get(text);
  if (hit) return hit;

  if (!context) {
    context = document.createElement("canvas").getContext("2d");
  }
  if (!context) {
    return { l: 0, r: text.length * 55, a: 72, d: 18, fa: 110, fd: 52 };
  }

  context.font = canvasFont(font);
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

export async function loadWordFont(font: PhotowallFont): Promise<void> {
  try {
    await document.fonts.load(canvasFont(font), "abcdefghijklmnopqrstuvwxyz0123456789-");
  } catch {
    return;
  } finally {
    cacheFor(font).clear();
  }
}
