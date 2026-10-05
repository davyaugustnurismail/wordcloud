import { assetUrl, type SessionSettings } from "../settings";
import { canvasFont } from "./fonts";
import { computeLayout } from "./layout";
import { loadWordFont, measureInk } from "./measure";
import { paletteFor, photowallBackground, pickWordColor } from "./palette";
import { applyCase } from "./text";

export const PNG_WIDTH = 3840;
export const PNG_HEIGHT = 2160;

type PngEntry = { id: string; text: string };

type PngSettings = Pick<
  SessionSettings,
  | "photowallTheme"
  | "photowallBgId"
  | "photowallColor"
  | "photowallOverlay"
  | "photowallFont"
  | "palette"
  | "caseStyle"
  | "k"
  | "minRatio"
  | "maxPct"
  | "safePct"
  | "maxWords"
>;

function loadImage(url: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

function drawCover(context: CanvasRenderingContext2D, image: HTMLImageElement, width: number, height: number) {
  const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight);
  const drawWidth = image.naturalWidth * scale;
  const drawHeight = image.naturalHeight * scale;
  context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight);
}

export async function renderWordcloudPng(
  entries: readonly PngEntry[],
  settings: PngSettings,
  width = PNG_WIDTH,
  height = PNG_HEIGHT,
): Promise<Blob> {
  const font = settings.photowallFont;
  await loadWordFont(font);

  const words = entries.slice(0, settings.maxWords).map((entry) => {
    const text = applyCase(entry.text, settings.caseStyle);
    return { id: entry.id, text, metrics: measureInk(text, font) };
  });
  const { placed } = computeLayout(words, {
    width,
    height,
    k: settings.k,
    minRatio: settings.minRatio,
    safePct: settings.safePct,
    maxPct: settings.maxPct,
  });

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia");

  context.fillStyle = photowallBackground(settings.photowallTheme, settings.photowallColor);
  context.fillRect(0, 0, width, height);

  if (settings.photowallTheme === "foto") {
    if (settings.photowallBgId) {
      const image = await loadImage(assetUrl(settings.photowallBgId));
      if (image) drawCover(context, image, width, height);
    }
    context.fillStyle = `rgba(0, 0, 0, ${settings.photowallOverlay / 100})`;
    context.fillRect(0, 0, width, height);
  }

  const palette = paletteFor(settings.photowallTheme, settings.palette, settings.photowallColor);
  context.textAlign = "left";
  context.textBaseline = "alphabetic";
  const metricsById = new Map(words.map((word) => [word.id, word.metrics]));
  for (const word of placed) {
    const metrics = metricsById.get(word.id);
    if (!metrics) continue;
    context.font = canvasFont(font, word.fs);
    context.fillStyle = pickWordColor(palette, word.id);
    context.fillText(word.text, word.x, word.y + (metrics.fa * word.fs) / 100);
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("PNG gagal dibuat"))), "image/png");
  });
}
