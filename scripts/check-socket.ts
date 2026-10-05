import { io } from "socket.io-client";

function flag(name: string): string | undefined {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

const flagValues = new Set(["origin", "code", "role"].map(flag));
const url =
  process.argv.slice(2).find((arg) => !arg.startsWith("--") && !flagValues.has(arg)) ?? "http://localhost:3000";
const origin = flag("origin");
const code = flag("code") ?? "KATA23";
const role = flag("role") ?? "display";
const label = `${url} (kode ${code}, peran ${role}${origin ? `, Origin ${origin}` : ""})`;

const socket = io(url, {
  transports: ["websocket"],
  reconnection: false,
  timeout: 5000,
  auth: { code, role },
  extraHeaders: origin ? { Origin: origin } : undefined,
});

const startedAt = performance.now();

socket.on("connect_error", (err) => {
  console.error(`GAGAL ${label}: ${err.message}`);
  process.exit(1);
});

socket.on("snapshot", (snapshot: { entries: unknown[] }) => {
  const elapsed = Math.round(performance.now() - startedAt);
  console.log(`OK ${label}: snapshot diterima (${snapshot.entries.length} kata) dalam ${elapsed} ms`);
  socket.disconnect();
  process.exit(0);
});
