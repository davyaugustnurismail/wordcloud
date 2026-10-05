import { z } from "zod";

export const DEFAULT_PROMPT = "Satu kata untuk malam ini?";

export const photowallThemes = ["hitam", "putih"] as const;
export const inputThemes = ["reggae", "hitam", "putih"] as const;
export const caseStyles = ["kecil", "asli", "kapital"] as const;

export type PhotowallTheme = (typeof photowallThemes)[number];
export type InputTheme = (typeof inputThemes)[number];
export type CaseStyle = (typeof caseStyles)[number];

export const sessionSettingsSchema = z.object({
  moderationMode: z.enum(["langsung", "approve"]).default("langsung"),
  photowallTheme: z.enum(photowallThemes).default("hitam"),
  inputTheme: z.enum(inputThemes).default("reggae"),
  prompt: z.string().trim().min(1).max(80).default(DEFAULT_PROMPT),
  maxChars: z.number().int().min(3).max(40).default(20),
  cardBlur: z.boolean().default(false),
  caseStyle: z.enum(caseStyles).default("kecil"),
  k: z.number().min(3).max(24).default(8),
  minRatio: z.number().min(0.1).max(0.5).default(0.2),
  maxPct: z.number().min(15).max(45).default(34),
  safePct: z.number().min(0).max(12).default(2),
  maxWords: z.number().int().min(10).max(1000).default(300),
});

export type SessionSettings = z.infer<typeof sessionSettingsSchema>;

export function defaultSettings(): SessionSettings {
  return sessionSettingsSchema.parse({});
}

export function parseSettings(raw: unknown): SessionSettings {
  const parsed = sessionSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : defaultSettings();
}
