import { isValidCode, normalizeCode } from "./code";

const ADMIN_PATH = /\/s\/([A-Za-z0-9]{6})\/admin(?:[/?#]|$)/;
const BARE_CODE = /^[A-Za-z0-9]{6}$/;

export function sessionCodeFromQr(text: string): string | null {
  const trimmed = text.trim();
  const raw = ADMIN_PATH.exec(trimmed)?.[1] ?? (BARE_CODE.test(trimmed) ? trimmed : null);
  if (!raw) return null;
  const candidate = normalizeCode(raw);
  return isValidCode(candidate) ? candidate : null;
}
