export function parseCookieHeader(header: string | undefined): Record<string, string> {
  const result: Record<string, string> = {};
  if (!header) return result;
  for (const part of header.split(";")) {
    const index = part.indexOf("=");
    if (index < 0) continue;
    const name = part.slice(0, index).trim();
    const value = part.slice(index + 1).trim();
    if (!name) continue;
    try {
      result[name] = decodeURIComponent(value);
    } catch {
      result[name] = value;
    }
  }
  return result;
}
