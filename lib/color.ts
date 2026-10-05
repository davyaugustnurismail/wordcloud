const HEX = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;
const HEX_LOOSE = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const OPAQUE_FROM = 0.995;

export function isHexColor(value: string): boolean {
  return HEX.test(value);
}

export function normalizeHex(value: string): string | null {
  const match = HEX_LOOSE.exec(value.trim());
  if (!match?.[1]) return null;
  let digits = match[1].toLowerCase();
  if (digits.length === 3) digits = [...digits].map((digit) => digit + digit).join("");
  if (digits.length === 8 && digits.endsWith("ff")) digits = digits.slice(0, 6);
  return `#${digits}`;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

export function hexAlpha(hex: string): number {
  return hex.length >= 9 ? Number.parseInt(hex.slice(7, 9), 16) / 255 : 1;
}

export function composeColor(hex: string, alpha: number): string {
  const base = hex.slice(0, 7).toLowerCase();
  const clamped = Math.min(1, Math.max(0, alpha));
  if (clamped >= OPAQUE_FROM) return base;
  return `${base}${Math.round(clamped * 255).toString(16).padStart(2, "0")}`;
}

export function scaleAlpha(hex: string, factor: number): string {
  return composeColor(hex, hexAlpha(hex) * factor);
}

export function flatten(hex: string, base = "#000000"): string {
  const alpha = hexAlpha(hex);
  if (alpha >= OPAQUE_FROM) return hex.slice(0, 7).toLowerCase();
  const under = hexAlpha(base) >= OPAQUE_FROM ? base : flatten(base);
  const [r, g, b] = hexToRgb(hex);
  const [ur, ug, ub] = hexToRgb(under);
  const mix = (top: number, bottom: number) => Math.round(top * alpha + bottom * (1 - alpha));
  return rgbToHex(mix(r, ur), mix(g, ug), mix(b, ub));
}

export function overBlack(hex: string): string {
  return hexAlpha(hex) >= OPAQUE_FROM ? hex : `linear-gradient(${hex}, ${hex}), #000000`;
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(foreground: string, background: string): number {
  const under = flatten(background);
  const a = relativeLuminance(flatten(foreground, under));
  const b = relativeLuminance(under);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function isDarkColor(hex: string, base = "#000000"): boolean {
  const flat = flatten(hex, base);
  return contrastRatio("#FFFFFF", flat) >= contrastRatio("#111111", flat);
}

export function readableOn(background: string, base = "#000000"): string {
  return isDarkColor(background, base) ? "#FFFFFF" : "#111111";
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * hexAlpha(hex) * 1000) / 1000})`;
}

export function minContrast(colors: readonly string[], background: string): number {
  if (colors.length === 0) return 21;
  return Math.min(...colors.map((color) => contrastRatio(color, background)));
}
