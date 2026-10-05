export const CLIENT_IP_HEADER = "x-wc-client-ip";

type HeaderBag = Record<string, string | string[] | undefined>;

const IP_PATTERN = /^[0-9a-fA-F:.]{3,45}$/;

function firstValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  const trimmed = raw?.trim();
  return trimmed ? trimmed : undefined;
}

function lastForwarded(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value.join(",") : value;
  return raw?.split(",").at(-1)?.trim() || undefined;
}

export function resolveClientIp(remoteAddress: string | undefined, headers: HeaderBag, trustProxy: boolean): string {
  const direct = remoteAddress?.replace(/^::ffff:/, "") || "unknown";
  if (!trustProxy) return direct;

  const candidate = firstValue(headers["x-real-ip"]) ?? lastForwarded(headers["x-forwarded-for"]);
  return candidate && IP_PATTERN.test(candidate) ? candidate : direct;
}

export function clientIp(headers: Headers): string {
  return headers.get(CLIENT_IP_HEADER) ?? "unknown";
}
