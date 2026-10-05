import { isDarkColor, readableOn, withAlpha } from "./color";
import type { InputBoxStyle, InputTheme, SessionSettings } from "./settings";

export type InputThemeTokens = {
  usesImage: boolean;
  background: string;
  text: string;
  helper: string;
  status: { text: string; dot: string; chipBackground: string | null };
  offline: { text: string; dot: string; chipBackground: string | null };
  field: { background: string; border: string; text: string; focusShadow: string };
  error: { ring: string; text: string };
  button: { background: string; color: string; disabledBackground: string; disabledColor: string };
  card: { background: string; border: string };
  sent: { background: string; color: string; check: string };
};

export type InputBoxSpec = {
  label: string;
  fieldRadiusClass: string;
  buttonRadiusClass: string;
  previewFieldRadius: string;
  previewButtonRadius: string;
  borderWidth: string;
  previewBorderWidth: string;
  transparentField: boolean;
  offsetShadow: boolean;
};

export const inputBoxSpecs: Record<InputBoxStyle, InputBoxSpec> = {
  membulat: {
    label: "Membulat",
    fieldRadiusClass: "rounded-[18px] md:rounded-[22px]",
    buttonRadiusClass: "rounded-[18px] md:rounded-[22px]",
    previewFieldRadius: "10px",
    previewButtonRadius: "10px",
    borderWidth: "4px",
    previewBorderWidth: "3px",
    transparentField: false,
    offsetShadow: false,
  },
  kotak: {
    label: "Kotak",
    fieldRadiusClass: "rounded-[4px]",
    buttonRadiusClass: "rounded-[4px]",
    previewFieldRadius: "2px",
    previewButtonRadius: "2px",
    borderWidth: "4px",
    previewBorderWidth: "3px",
    transparentField: false,
    offsetShadow: false,
  },
  pil: {
    label: "Pil",
    fieldRadiusClass: "rounded-full",
    buttonRadiusClass: "rounded-full",
    previewFieldRadius: "999px",
    previewButtonRadius: "999px",
    borderWidth: "4px",
    previewBorderWidth: "3px",
    transparentField: false,
    offsetShadow: false,
  },
  garis: {
    label: "Garis",
    fieldRadiusClass: "rounded-[14px]",
    buttonRadiusClass: "rounded-[14px]",
    previewFieldRadius: "8px",
    previewButtonRadius: "8px",
    borderWidth: "2px",
    previewBorderWidth: "2px",
    transparentField: true,
    offsetShadow: false,
  },
  bawah: {
    label: "Garis bawah",
    fieldRadiusClass: "rounded-none",
    buttonRadiusClass: "rounded-none",
    previewFieldRadius: "0",
    previewButtonRadius: "0",
    borderWidth: "0 0 4px 0",
    previewBorderWidth: "0 0 3px 0",
    transparentField: true,
    offsetShadow: false,
  },
  timbul: {
    label: "Timbul",
    fieldRadiusClass: "rounded-[10px]",
    buttonRadiusClass: "rounded-[10px]",
    previewFieldRadius: "6px",
    previewButtonRadius: "6px",
    borderWidth: "4px",
    previewBorderWidth: "3px",
    transparentField: false,
    offsetShadow: true,
  },
};

export const baseInputThemeTokens: Record<Exclude<InputTheme, "warna">, InputThemeTokens> = {
  reggae: {
    usesImage: false,
    background: "linear-gradient(to bottom, #D62F2F 0 33.34%, #F5C02E 33.34% 66.67%, #17924A 66.67% 100%)",
    text: "#0C0C0C",
    helper: "#0C0C0C",
    status: { text: "#FFFFFF", dot: "#3DDC84", chipBackground: "#0C0C0C" },
    offline: { text: "#FFFFFF", dot: "#FF5A5A", chipBackground: "#0C0C0C" },
    field: { background: "#FFFFFF", border: "#0C0C0C", text: "#0C0C0C", focusShadow: "none" },
    error: { ring: "#B3261E", text: "#B3261E" },
    button: { background: "#0C0C0C", color: "#F5C02E", disabledBackground: "rgba(12,12,12,0.55)", disabledColor: "#D9D9D9" },
    card: { background: "rgba(255,255,255,0.32)", border: "rgba(255,255,255,0.45)" },
    sent: { background: "#0C0C0C", color: "#FFFFFF", check: "#17924A" },
  },
  hitam: {
    usesImage: false,
    background: "#000000",
    text: "#FFFFFF",
    helper: "#BDBDBD",
    status: { text: "#BDBDBD", dot: "#3DDC84", chipBackground: null },
    offline: { text: "#BDBDBD", dot: "#FF5A5A", chipBackground: null },
    field: { background: "#141416", border: "#FFE14D", text: "#FFFFFF", focusShadow: "0 0 0 8px rgba(255,225,77,0.14)" },
    error: { ring: "#FF5A5A", text: "#FF8080" },
    button: { background: "#FFE14D", color: "#000000", disabledBackground: "#2A2A2E", disabledColor: "#75757C" },
    card: { background: "rgba(255,255,255,0.07)", border: "rgba(255,255,255,0.14)" },
    sent: { background: "#FFFFFF", color: "#000000", check: "#17924A" },
  },
  putih: {
    usesImage: false,
    background: "#FFFFFF",
    text: "#141416",
    helper: "#5B5B63",
    status: { text: "#5B5B63", dot: "#15803D", chipBackground: null },
    offline: { text: "#B42318", dot: "#B42318", chipBackground: null },
    field: { background: "#F6F5F1", border: "#141416", text: "#141416", focusShadow: "0 0 0 8px rgba(20,20,22,0.10)" },
    error: { ring: "#C62828", text: "#C62828" },
    button: { background: "#141416", color: "#FFFFFF", disabledBackground: "#E7E6E0", disabledColor: "#6E6E74" },
    card: { background: "rgba(20,20,22,0.04)", border: "rgba(20,20,22,0.10)" },
    sent: { background: "#141416", color: "#FFFFFF", check: "#15803D" },
  },
  foto: {
    usesImage: true,
    background: "#000000",
    text: "#FFFFFF",
    helper: "#E6E6E6",
    status: { text: "#E6E6E6", dot: "#3DDC84", chipBackground: null },
    offline: { text: "#E6E6E6", dot: "#FF5A5A", chipBackground: null },
    field: { background: "#FFFFFF", border: "#FFFFFF", text: "#0C0C0C", focusShadow: "0 0 0 8px rgba(255,255,255,0.18)" },
    error: { ring: "#FF5A5A", text: "#FF8080" },
    button: { background: "#FFE14D", color: "#0C0C0C", disabledBackground: "rgba(255,255,255,0.22)", disabledColor: "rgba(255,255,255,0.6)" },
    card: { background: "rgba(10,10,12,0.45)", border: "rgba(255,255,255,0.14)" },
    sent: { background: "#FFFFFF", color: "#000000", check: "#17924A" },
  },
};

export type InputThemeSettings = Pick<
  SessionSettings,
  | "inputTheme"
  | "inputColor"
  | "inputBoxStyle"
  | "inputTextColor"
  | "inputFieldColor"
  | "inputFieldTextColor"
  | "inputBorderColor"
  | "inputButtonColor"
>;

export type ResolvedInputTheme = InputThemeTokens & { box: InputBoxSpec; fieldShadow: string | null; buttonShadow: string | null };

function solidTokens(background: string): InputThemeTokens {
  const dark = isDarkColor(background);
  const text = dark ? "#FFFFFF" : "#111111";
  const helper = withAlpha(text, 0.78);
  return {
    usesImage: false,
    background,
    text,
    helper,
    status: { text: helper, dot: dark ? "#3DDC84" : "#15803D", chipBackground: null },
    offline: { text: dark ? "#FF8080" : "#B42318", dot: dark ? "#FF5A5A" : "#B42318", chipBackground: null },
    field: { background: "#FFFFFF", border: text, text: "#0C0C0C", focusShadow: `0 0 0 8px ${withAlpha(text, 0.18)}` },
    error: { ring: dark ? "#FF5A5A" : "#C62828", text: dark ? "#FF8080" : "#C62828" },
    button: {
      background: dark ? "#FFE14D" : "#141416",
      color: dark ? "#0C0C0C" : "#FFFFFF",
      disabledBackground: withAlpha(text, 0.22),
      disabledColor: withAlpha(text, 0.6),
    },
    card: {
      background: dark ? "rgba(255,255,255,0.08)" : "rgba(20,20,22,0.05)",
      border: dark ? "rgba(255,255,255,0.16)" : "rgba(20,20,22,0.12)",
    },
    sent: { background: text, color: dark ? "#000000" : "#FFFFFF", check: "#17924A" },
  };
}

export function baseTokensFor(settings: Pick<InputThemeSettings, "inputTheme" | "inputColor">): InputThemeTokens {
  return settings.inputTheme === "warna" ? solidTokens(settings.inputColor) : baseInputThemeTokens[settings.inputTheme];
}

export function resolveInputTheme(settings: InputThemeSettings): ResolvedInputTheme {
  const base = baseTokensFor(settings);
  const box = inputBoxSpecs[settings.inputBoxStyle];
  const tokens: InputThemeTokens = {
    ...base,
    status: { ...base.status },
    field: { ...base.field },
    button: { ...base.button },
  };

  if (settings.inputTextColor) {
    tokens.text = settings.inputTextColor;
    tokens.helper = withAlpha(settings.inputTextColor, 0.82);
    if (!tokens.status.chipBackground) tokens.status.text = tokens.helper;
  }
  if (settings.inputFieldColor) tokens.field.background = settings.inputFieldColor;
  if (settings.inputFieldTextColor) tokens.field.text = settings.inputFieldTextColor;
  if (settings.inputBorderColor) {
    tokens.field.border = settings.inputBorderColor;
    tokens.field.focusShadow = `0 0 0 8px ${withAlpha(settings.inputBorderColor, 0.2)}`;
  }
  if (settings.inputButtonColor) {
    const color = readableOn(settings.inputButtonColor);
    tokens.button = {
      background: settings.inputButtonColor,
      color,
      disabledBackground: withAlpha(settings.inputButtonColor, 0.4),
      disabledColor: withAlpha(color, 0.7),
    };
  }

  if (box.transparentField) {
    tokens.field.background = "transparent";
    if (!settings.inputFieldTextColor) tokens.field.text = tokens.text;
  }

  const fieldShadow = box.offsetShadow ? `6px 6px 0 0 ${tokens.field.border}` : null;
  const buttonShadow = box.offsetShadow ? `6px 6px 0 0 ${tokens.field.border}` : null;
  if (box.offsetShadow) tokens.field.focusShadow = `6px 6px 0 0 ${tokens.field.border}, 0 0 0 5px ${withAlpha(tokens.field.border, 0.28)}`;

  return { ...tokens, box, fieldShadow, buttonShadow };
}
