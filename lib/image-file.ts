export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const IMAGE_FILE_HELP = "Gambar maksimal 10 MB (JPG, PNG, atau WebP).";

export function checkImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES) {
    return IMAGE_FILE_HELP;
  }
  return null;
}

export function uploadErrorMessage(status: number): string {
  if (status === 413) return "Gambar terlalu besar. Maksimal 10 MB.";
  if (status === 401) return "Sesi admin berakhir. Masuk lagi.";
  if (status === 429) return "Terlalu banyak upload. Coba lagi sebentar.";
  return "Gambar tidak bisa dipakai. Gunakan JPG, PNG, atau WebP.";
}
