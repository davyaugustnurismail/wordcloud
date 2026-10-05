export type WordCheck = { ok: true; text: string } | { ok: false; reason: "empty" | "space" };

export function countChars(value: string): number {
  return [...value].length;
}

export function stripWord(raw: string, maxChars: number): string {
  const cleaned = raw.replace(/[^\p{L}\p{N}\- ]/gu, "");
  return [...cleaned].slice(0, maxChars).join("");
}

export function checkWord(raw: string, maxChars: number): WordCheck {
  const cleaned = stripWord(raw, maxChars).trim();
  if (!cleaned) return { ok: false, reason: "empty" };
  if (/\s/.test(cleaned)) return { ok: false, reason: "space" };
  return { ok: true, text: cleaned };
}

export function normalizeWord(text: string): string {
  return text.normalize("NFKC").toLowerCase();
}

export function hasInnerSpace(value: string): boolean {
  return /\S\s+\S/.test(value);
}
