import { z } from "zod";

export const DEFAULT_PROMPT = "Satu kata untuk malam ini?";

export const photowallThemes = ["hitam", "putih", "foto"] as const;
export const inputThemes = ["reggae", "hitam", "putih", "foto"] as const;
export const caseStyles = ["kecil", "asli", "kapital"] as const;
export const photowallFonts = ["baloo", "poppins", "fredoka"] as const;
export const moderationModes = ["langsung", "approve"] as const;

export type PhotowallTheme = (typeof photowallThemes)[number];
export type InputTheme = (typeof inputThemes)[number];
export type CaseStyle = (typeof caseStyles)[number];
export type PhotowallFont = (typeof photowallFonts)[number];
export type ModerationMode = (typeof moderationModes)[number];

export const MAX_PALETTE_COLORS = 10;

const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const fields = {
  moderationMode: z.enum(moderationModes),
  photowallTheme: z.enum(photowallThemes),
  inputTheme: z.enum(inputThemes),
  photowallBgId: z.uuid().nullable(),
  inputBgId: z.uuid().nullable(),
  photowallOverlay: z.number().int().min(0).max(85),
  photowallFont: z.enum(photowallFonts),
  palette: z.array(hexColor).min(1).max(MAX_PALETTE_COLORS).nullable(),
  prompt: z.string().trim().min(1).max(80),
  maxChars: z.number().int().min(3).max(40),
  cardBlur: z.boolean(),
  caseStyle: z.enum(caseStyles),
  k: z.number().min(3).max(24),
  minRatio: z.number().min(0.1).max(0.5),
  maxPct: z.number().min(15).max(45),
  safePct: z.number().min(0).max(12),
  maxWords: z.number().int().min(10).max(1000),
};

export const sessionSettingsSchema = z.object({
  moderationMode: fields.moderationMode.default("langsung"),
  photowallTheme: fields.photowallTheme.default("hitam"),
  inputTheme: fields.inputTheme.default("reggae"),
  photowallBgId: fields.photowallBgId.default(null),
  inputBgId: fields.inputBgId.default(null),
  photowallOverlay: fields.photowallOverlay.default(45),
  photowallFont: fields.photowallFont.default("baloo"),
  palette: fields.palette.default(null),
  prompt: fields.prompt.default(DEFAULT_PROMPT),
  maxChars: fields.maxChars.default(20),
  cardBlur: fields.cardBlur.default(false),
  caseStyle: fields.caseStyle.default("kecil"),
  k: fields.k.default(8),
  minRatio: fields.minRatio.default(0.2),
  maxPct: fields.maxPct.default(34),
  safePct: fields.safePct.default(2),
  maxWords: fields.maxWords.default(300),
});

export type SessionSettings = z.infer<typeof sessionSettingsSchema>;

export const settingsPatchSchema = z
  .object({
    photowallTheme: fields.photowallTheme.optional(),
    inputTheme: fields.inputTheme.optional(),
    photowallBgId: fields.photowallBgId.optional(),
    inputBgId: fields.inputBgId.optional(),
    photowallOverlay: fields.photowallOverlay.optional(),
    photowallFont: fields.photowallFont.optional(),
    palette: fields.palette.optional(),
    prompt: fields.prompt.optional(),
    maxChars: fields.maxChars.optional(),
    cardBlur: fields.cardBlur.optional(),
    caseStyle: fields.caseStyle.optional(),
    k: fields.k.optional(),
    minRatio: fields.minRatio.optional(),
    maxPct: fields.maxPct.optional(),
    safePct: fields.safePct.optional(),
    maxWords: fields.maxWords.optional(),
  })
  .strict();

export type SettingsPatch = z.infer<typeof settingsPatchSchema>;

export function defaultSettings(): SessionSettings {
  return sessionSettingsSchema.parse({});
}

export function parseSettings(raw: unknown): SessionSettings {
  const parsed = sessionSettingsSchema.safeParse(raw ?? {});
  return parsed.success ? parsed.data : defaultSettings();
}

export function assetUrl(id: string): string {
  return `/api/assets/${id}`;
}
