import type { PhotowallTheme } from "@/lib/settings";

const labels: Record<PhotowallTheme, string> = {
  hitam: "Hitam",
  putih: "Putih",
  foto: "Foto",
  warna: "Warna",
};

export function themeLabel(theme: PhotowallTheme): string {
  return labels[theme];
}
