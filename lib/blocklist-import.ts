import { countChars, normalizeWord, stripWord } from "./words";

export const MAX_TERM_CHARS = 40;
export const MAX_IMPORT_TERMS = 5000;
export const MAX_INVALID_SAMPLES = 12;

const QUOTES = /^["'“”‘’`]+|["'“”‘’`]+$/g;
const SEPARATORS = /[\s,;]+/;

export type ParsedTerms = {
  terms: string[];
  duplicates: number;
  invalidCount: number;
  invalidSamples: string[];
  truncated: boolean;
};

export function withoutBom(text: string): string {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function toBlockTerm(raw: string): string | null {
  const token = raw.replace(QUOTES, "");
  if (!token || /\s/.test(token) || countChars(token) > MAX_TERM_CHARS) return null;
  if (stripWord(token, MAX_TERM_CHARS) !== token) return null;
  if (!/[\p{L}\p{N}]/u.test(token)) return null;
  return normalizeWord(token);
}

export function dropFirstLine(text: string): string {
  const index = text.indexOf("\n");
  return index < 0 ? "" : text.slice(index + 1);
}

export function parseTerms(text: string): ParsedTerms {
  const seen = new Set<string>();
  const invalidSamples: string[] = [];
  let duplicates = 0;
  let invalidCount = 0;
  let truncated = false;

  for (const raw of withoutBom(text).split(SEPARATORS)) {
    if (!raw) continue;
    const term = toBlockTerm(raw);
    if (term === null) {
      invalidCount++;
      if (invalidSamples.length < MAX_INVALID_SAMPLES && !invalidSamples.includes(raw)) invalidSamples.push(raw);
      continue;
    }
    if (seen.has(term)) {
      duplicates++;
      continue;
    }
    if (seen.size >= MAX_IMPORT_TERMS) {
      truncated = true;
      continue;
    }
    seen.add(term);
  }

  return { terms: [...seen], duplicates, invalidCount, invalidSamples, truncated };
}
