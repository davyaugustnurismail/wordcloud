const HEX6 = /^#[0-9a-fA-F]{6}$/;
const HEX3 = /^#?([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/;
const HEX6_LOOSE = /^#?([0-9a-fA-F]{6})$/;

export function isHexColor(value: string): boolean {
  return HEX6.test(value);
}

export function normalizeHex(value: string): string | null {
  const trimmed = value.trim();
  const short = HEX3.exec(trimmed);
  if (short) return `#${short[1]}${short[1]}${short[2]}${short[2]}${short[3]}${short[3]}`.toLowerCase();
  const long = HEX6_LOOSE.exec(trimmed);
  return long ? `#${long[1]}`.toLowerCase() : null;
}

export function hexToRgb(hex: string): [number, number, number] {
  const value = Number.parseInt(hex.slice(1, 7), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255];
}

function channel(value: number): number {
  const scaled = value / 255;
  return scaled <= 0.03928 ? scaled / 12.92 : ((scaled + 0.055) / 1.055) ** 2.4;
}

export function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrastRatio(first: string, second: string): number {
  const a = relativeLuminance(first);
  const b = relativeLuminance(second);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

export function isDarkColor(hex: string): boolean {
  return contrastRatio(hex, "#FFFFFF") >= contrastRatio(hex, "#111111");
}

export function readableOn(background: string): string {
  return isDarkColor(background) ? "#FFFFFF" : "#111111";
}

export function withAlpha(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function minContrast(colors: readonly string[], background: string): number {
  if (colors.length === 0) return 21;
  return Math.min(...colors.map((color) => contrastRatio(color, background)));
}
