import type { PhotowallTheme } from "../settings";
import { hash32 } from "./layout";

const palettes: Record<PhotowallTheme, readonly string[]> = {
  hitam: ["#FFE14D", "#3DE0FF", "#FF4FAE", "#59F59A", "#FF9F45", "#B79CFF", "#FFFFFF"],
  putih: ["#0B2E8A", "#B0125B", "#0A6B4C", "#B93D08", "#5A22B0", "#141416"],
};

export const photowallBackgrounds: Record<PhotowallTheme, string> = {
  hitam: "#000000",
  putih: "#FFFFFF",
};

export function pickWordColor(theme: PhotowallTheme, id: string): string {
  const palette = palettes[theme];
  return palette[hash32(id) % palette.length] ?? "#FFFFFF";
}
