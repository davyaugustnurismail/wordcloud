import { z } from "zod";

export const DEFAULT_PROMPT = "Satu kata untuk malam ini?";

export const photowallThemes = ["hitam", "putih", "foto", "warna"] as const;
export const inputThemes = ["reggae", "hitam", "putih", "foto", "warna"] as const;
export const inputBoxStyles = ["membulat", "kotak", "pil", "garis", "bawah", "timbul"] as const;
export const caseStyles = ["kecil", "asli", "kapital"] as const;
export const photowallFonts = ["baloo", "poppins", "fredoka"] as const;
export const moderationModes = ["langsung", "approve"] as const;

export type PhotowallTheme = (typeof photowallThemes)[number];
export type InputTheme = (typeof inputThemes)[number];
export type InputBoxStyle = (typeof inputBoxStyles)[number];
export type CaseStyle = (typeof caseStyles)[number];
export type PhotowallFont = (typeof photowallFonts)[number];
export type ModerationMode = (typeof moderationModes)[number];

export const MAX_PALETTE_COLORS = 10;
export const DEFAULT_PHOTOWALL_COLOR = "#1b2a49";
export const DEFAULT_INPUT_COLOR = "#ffe14d";

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/);

const fields = {
  moderationMode: z.enum(moderationModes),
  photowallTheme: z.enum(photowallThemes),
  inputTheme: z.enum(inputThemes),
  photowallBgId: z.uuid().nullable(),
  inputBgId: z.uuid().nullable(),
  photowallColor: hexColor,
  inputColor: hexColor,
  photowallOverlay: z.number().int().min(0).max(85),
  inputOverlay: z.number().int().min(0).max(85),
  photowallFont: z.enum(photowallFonts),
  palette: z.array(hexColor).min(1).max(MAX_PALETTE_COLORS).nullable(),
  inputBoxStyle: z.enum(inputBoxStyles),
  inputTextColor: hexColor.nullable(),
  inputFieldColor: hexColor.nullable(),
  inputFieldTextColor: hexColor.nullable(),
  inputBorderColor: hexColor.nullable(),
  inputButtonColor: hexColor.nullable(),
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
  photowallColor: fields.photowallColor.default(DEFAULT_PHOTOWALL_COLOR),
  inputColor: fields.inputColor.default(DEFAULT_INPUT_COLOR),
  photowallOverlay: fields.photowallOverlay.default(45),
  inputOverlay: fields.inputOverlay.default(55),
  photowallFont: fields.photowallFont.default("baloo"),
  palette: fields.palette.default(null),
  inputBoxStyle: fields.inputBoxStyle.default("membulat"),
  inputTextColor: fields.inputTextColor.default(null),
  inputFieldColor: fields.inputFieldColor.default(null),
  inputFieldTextColor: fields.inputFieldTextColor.default(null),
  inputBorderColor: fields.inputBorderColor.default(null),
  inputButtonColor: fields.inputButtonColor.default(null),
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

export const sessionDefaultsSchema = sessionSettingsSchema.pick({
  photowallTheme: true,
  inputTheme: true,
  moderationMode: true,
  k: true,
  maxChars: true,
  safePct: true,
});

export type SessionDefaults = z.infer<typeof sessionDefaultsSchema>;

export const settingsPatchSchema = z
  .object({
    photowallTheme: fields.photowallTheme.optional(),
    inputTheme: fields.inputTheme.optional(),
    photowallBgId: fields.photowallBgId.optional(),
    inputBgId: fields.inputBgId.optional(),
    photowallColor: fields.photowallColor.optional(),
    inputColor: fields.inputColor.optional(),
    photowallOverlay: fields.photowallOverlay.optional(),
    inputOverlay: fields.inputOverlay.optional(),
    photowallFont: fields.photowallFont.optional(),
    palette: fields.palette.optional(),
    inputBoxStyle: fields.inputBoxStyle.optional(),
    inputTextColor: fields.inputTextColor.optional(),
    inputFieldColor: fields.inputFieldColor.optional(),
    inputFieldTextColor: fields.inputFieldTextColor.optional(),
    inputBorderColor: fields.inputBorderColor.optional(),
    inputButtonColor: fields.inputButtonColor.optional(),
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
