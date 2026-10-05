export const CLIENT_IP_HEADER = "x-wc-client-ip";

export function clientIp(headers: Headers): string {
  return headers.get(CLIENT_IP_HEADER) ?? "unknown";
}
