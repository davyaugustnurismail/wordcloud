import type { InputTheme } from "./settings";

export type InputThemeTokens = {
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

export const inputThemeTokens: Record<InputTheme, InputThemeTokens> = {
  reggae: {
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
};
