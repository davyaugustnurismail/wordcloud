export const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export const CODE_LENGTH = 6;

export function normalizeCode(input: string): string {
  return input
    .toUpperCase()
    .replace(/[^A-Z2-9]/g, "")
    .replace(/[OI]/g, "")
    .slice(0, CODE_LENGTH);
}

export function isValidCode(code: string): boolean {
  return code.length === CODE_LENGTH && [...code].every((char) => CODE_ALPHABET.includes(char));
}
