import type { PhotowallFont } from "../settings";

export type FontSpec = {
  label: string;
  family: string;
  cssVar: string;
  weight: number;
};

export const fontSpecs: Record<PhotowallFont, FontSpec> = {
  baloo: { label: "Baloo 2 ExtraBold", family: "Baloo 2", cssVar: "--font-baloo", weight: 800 },
  poppins: { label: "Poppins ExtraBold", family: "Poppins", cssVar: "--font-poppins", weight: 800 },
  fredoka: { label: "Fredoka Bold", family: "Fredoka", cssVar: "--font-fredoka", weight: 700 },
};

export function canvasFont(font: PhotowallFont, size = 100): string {
  const spec = fontSpecs[font];
  return `${spec.weight} ${size}px "${spec.family}", "Trebuchet MS", sans-serif`;
}

export function cssFontFamily(font: PhotowallFont): string {
  const spec = fontSpecs[font];
  return `var(${spec.cssVar}), "${spec.family}", "Trebuchet MS", sans-serif`;
}
