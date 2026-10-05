import { isDarkColor, overBlack, scaleAlpha } from "../color";
import type { PhotowallTheme } from "../settings";
import { hash32 } from "./layout";

export type PalettePreset = { id: string; label: string; colors: readonly string[] };

const BRIGHT = ["#FFE14D", "#3DE0FF", "#FF4FAE", "#59F59A", "#FF9F45", "#B79CFF", "#FFFFFF"] as const;
const DEEP = ["#0B2E8A", "#B0125B", "#0A6B4C", "#B93D08", "#5A22B0", "#141416"] as const;

export const defaultPalettes: Record<PhotowallTheme, readonly string[]> = {
  hitam: BRIGHT,
  putih: DEEP,
  foto: ["#FFFFFF", "#FFE14D", "#8BE9FF", "#FF8CCB", "#9DFFBF"],
  warna: BRIGHT,
};

export const palettePresets: readonly PalettePreset[] = [
  { id: "cerah", label: "Cerah", colors: BRIGHT },
  { id: "pastel", label: "Pastel", colors: ["#FFD6E0", "#C9E4FF", "#D7F5DD", "#FFF1B8", "#E5D4FF", "#FFE0C2"] },
  { id: "neon", label: "Neon", colors: ["#39FF14", "#FF10F0", "#00F0FF", "#FFF01F", "#FF3131", "#BC13FE"] },
  { id: "hangat", label: "Hangat", colors: ["#FFD166", "#FF9F45", "#FF6B6B", "#F7B267", "#FFE5B4", "#EF476F"] },
  { id: "dingin", label: "Dingin", colors: ["#8BE9FF", "#5AB0FF", "#7B8CFF", "#9DFFD8", "#B79CFF", "#FFFFFF"] },
  { id: "emas", label: "Emas", colors: ["#FFD700", "#F5C542", "#E8B04A", "#FFF1B8", "#C99A2E"] },
  { id: "gelap", label: "Gelap", colors: DEEP },
  { id: "putih", label: "Putih", colors: ["#FFFFFF"] },
  { id: "hitam", label: "Hitam", colors: ["#141416"] },
];

export const photowallBackgrounds: Record<Exclude<PhotowallTheme, "warna">, string> = {
  hitam: "#000000",
  putih: "#FFFFFF",
  foto: "#000000",
};

export function photowallBackground(theme: PhotowallTheme, color: string): string {
  return theme === "warna" ? color : photowallBackgrounds[theme];
}

export function stageBackground(theme: PhotowallTheme, color: string): string {
  return overBlack(photowallBackground(theme, color));
}

export function paletteFor(
  theme: PhotowallTheme,
  custom: readonly string[] | null,
  color: string,
): readonly string[] {
  if (custom && custom.length > 0) return custom;
  if (theme === "warna") return isDarkColor(color) ? BRIGHT : DEEP;
  return defaultPalettes[theme];
}

export function samePalette(a: readonly string[] | null, b: readonly string[] | null): boolean {
  if (!a || !b || a.length !== b.length) return false;
  return a.every((color, index) => color.toLowerCase() === b[index]?.toLowerCase());
}

export function wordOpacity(transparency: number): number {
  return 1 - transparency / 100;
}

export function pickWordColor(palette: readonly string[], id: string, transparency = 0): string {
  const color = palette[hash32(id) % palette.length] ?? "#FFFFFF";
  return transparency > 0 ? scaleAlpha(color, wordOpacity(transparency)) : color;
}
