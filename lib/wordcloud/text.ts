import type { CaseStyle } from "../settings";

export function applyCase(text: string, style: CaseStyle): string {
  if (style === "kapital") return text.toUpperCase();
  if (style === "kecil") return text.toLowerCase();
  return text;
}
