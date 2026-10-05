import type { PhotowallTheme } from "../settings";
import { hash32 } from "./layout";

export const defaultPalettes: Record<PhotowallTheme, readonly string[]> = {
  hitam: ["#FFE14D", "#3DE0FF", "#FF4FAE", "#59F59A", "#FF9F45", "#B79CFF", "#FFFFFF"],
  putih: ["#0B2E8A", "#B0125B", "#0A6B4C", "#B93D08", "#5A22B0", "#141416"],
  foto: ["#FFFFFF", "#FFE14D", "#8BE9FF", "#FF8CCB", "#9DFFBF"],
};

export const photowallBackgrounds: Record<PhotowallTheme, string> = {
  hitam: "#000000",
  putih: "#FFFFFF",
  foto: "#000000",
};

export function paletteFor(theme: PhotowallTheme, custom: readonly string[] | null): readonly string[] {
  return custom && custom.length > 0 ? custom : defaultPalettes[theme];
}

export function pickWordColor(palette: readonly string[], id: string): string {
  return palette[hash32(id) % palette.length] ?? "#FFFFFF";
}
