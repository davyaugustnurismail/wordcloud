export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 40;

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const RESERVED_SLUGS = new Set([
  "admin",
  "api",
  "apple-icon",
  "assets",
  "brand",
  "create",
  "favicon",
  "health",
  "icon",
  "join",
  "login",
  "logout",
  "manifest",
  "masuk-admin",
  "next",
  "robots",
  "sitemap",
  "static",
]);

export type SlugProblem = "empty" | "short" | "long" | "format" | "reserved";

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_LENGTH)
    .replace(/-+$/g, "");
}

export function cleanSlugInput(input: string): string {
  return input
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, SLUG_MAX_LENGTH);
}

export function slugProblem(slug: string): SlugProblem | null {
  if (slug.length === 0) return "empty";
  if (slug.length < SLUG_MIN_LENGTH) return "short";
  if (slug.length > SLUG_MAX_LENGTH) return "long";
  if (!SLUG_PATTERN.test(slug)) return "format";
  if (RESERVED_SLUGS.has(slug)) return "reserved";
  return null;
}

export function slugProblemMessage(problem: SlugProblem): string {
  switch (problem) {
    case "empty":
      return "Alamat sesi belum diisi.";
    case "short":
      return `Minimal ${SLUG_MIN_LENGTH} karakter.`;
    case "long":
      return `Maksimal ${SLUG_MAX_LENGTH} karakter.`;
    case "format":
      return "Hanya huruf kecil, angka, dan tanda hubung di tengah.";
    case "reserved":
      return "Alamat ini dipakai sistem. Pilih yang lain.";
  }
}
