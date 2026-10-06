import { z } from "zod";
import { MAX_IMPORT_TERMS, toBlockTerm } from "./blocklist-import";

export const bulkBodySchema = z.object({
  terms: z.array(z.string().max(200)).min(1).max(MAX_IMPORT_TERMS * 2),
});

export type BulkSplit = { terms: string[]; invalid: number };

export function splitBulkTerms(raw: string[]): BulkSplit {
  const seen = new Set<string>();
  let invalid = 0;
  for (const value of raw) {
    const term = toBlockTerm(value);
    if (term === null) invalid++;
    else seen.add(term);
  }
  return { terms: [...seen].slice(0, MAX_IMPORT_TERMS), invalid };
}
