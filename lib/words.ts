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

const LOOKALIKES: Record<string, string> = {
  "0": "o",
  "1": "i",
  "3": "e",
  "4": "a",
  "5": "s",
  "6": "g",
  "7": "t",
  "8": "b",
  "9": "g",
  l: "i",
  "@": "a",
  $: "s",
  "!": "i",
  "|": "i",
  "+": "t",
  а: "a",
  в: "b",
  е: "e",
  к: "k",
  м: "m",
  н: "h",
  о: "o",
  р: "p",
  с: "c",
  т: "t",
  у: "y",
  х: "x",
  і: "i",
  ј: "j",
  ѕ: "s",
  ο: "o",
  α: "a",
  ε: "e",
  ι: "i",
  κ: "k",
  ν: "v",
  ρ: "p",
  τ: "t",
  υ: "u",
  χ: "x",
};

const RAW_KEY_MAX = 120;

export function skeletonWord(text: string): string {
  let out = "";
  for (const char of text.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()) {
    const mapped = LOOKALIKES[char] ?? char;
    if (/[\p{L}\p{N}]/u.test(mapped)) out += mapped;
  }
  return out.replace(/(.)\1+/gu, "$1");
}

export function blockKeys(raw: string, checkedText: string): string[] {
  const keys = new Set([skeletonWord(checkedText)]);
  const compact = raw.slice(0, RAW_KEY_MAX).replace(/\s+/g, "");
  keys.add(skeletonWord(compact));
  keys.add(skeletonWord(compact.replace(/[^\p{L}\p{N}]+$/u, "")));
  keys.delete("");
  return [...keys];
}

export function hasInnerSpace(value: string): boolean {
  return /\S\s+\S/.test(value);
}
