import { io, type Socket } from "socket.io-client";

type Options = {
  url: string;
  code: string;
  clients: number;
  rounds: number;
  gapMs: number;
  prefix: string;
};

type AckResult = { status: "shown" | "pending" | "rejected" | "timeout"; ms: number; reason?: string };

function parseArgs(argv: string[]): Options {
  const values = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg?.startsWith("--")) values.set(arg.slice(2), argv[i + 1] ?? "");
  }
  const url = (values.get("url") ?? "http://localhost:3000").replace(/\/$/, "");
  const code = (values.get("code") ?? "").toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) {
    console.error('Pemakaian: npm run loadtest -- --code KODE [--url https://domain] [--clients 300] [--rounds 1] [--gap 1500]');
    process.exit(1);
  }
  return {
    url,
    code,
    clients: Math.max(1, Number(values.get("clients") ?? 300)),
    rounds: Math.max(1, Number(values.get("rounds") ?? 1)),
    gapMs: Math.max(0, Number(values.get("gap") ?? 1500)),
    prefix: values.get("prefix") ?? "uji",
  };
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)] ?? 0;
}

function summary(values: number[]): string {
  return `n=${values.length} p50=${percentile(values, 50).toFixed(0)}ms p95=${percentile(values, 95).toFixed(0)}ms maks=${Math.max(0, ...values).toFixed(0)}ms`;
}

function letters(value: number): string {
  let out = "";
  let rest = value;
  do {
    out = String.fromCharCode(97 + (rest % 26)) + out;
    rest = Math.floor(rest / 26);
  } while (rest > 0);
  return out;
}

function connect(options: Options, auth: Record<string, string>): Promise<{ socket: Socket; ms: number } | null> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const socket = io(options.url, { transports: ["websocket"], reconnection: false, auth: { code: options.code, ...auth }, timeout: 20_000 });
    socket.once("connect_error", () => resolve(null));
    socket.once("snapshot", () => resolve({ socket, ms: performance.now() - startedAt }));
  });
}

function submit(socket: Socket, text: string): Promise<AckResult> {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    socket.timeout(10_000).emit("entry:submit", { text }, (error: Error | null, ack?: { status: string; reason?: string }) => {
      const ms = performance.now() - startedAt;
      if (error || !ack) resolve({ status: "timeout", ms });
      else resolve({ status: ack.status as AckResult["status"], ms, reason: ack.reason });
    });
  });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const runId = letters(Date.now() % 1_000_000);
  console.log(`Target ${options.url}, sesi ${options.code}, ${options.clients} klien, ${options.rounds} putaran`);

  const display = await connect(options, { role: "display" });
  if (!display) {
    console.error("Gagal terhubung sebagai display. Periksa alamat dan kode sesi.");
    process.exit(1);
  }
  const arrivedAt = new Map<string, number>();
  display.socket.on("entry:shown", (entry: { text: string }) => {
    if (!arrivedAt.has(entry.text)) arrivedAt.set(entry.text, performance.now());
  });

  const startedAt = performance.now();
  const clients = await Promise.all(
    Array.from({ length: options.clients }, (_, index) => connect(options, { role: "input", deviceId: `loadtest-${runId}-${index}` })),
  );
  const connected = clients.filter((client): client is { socket: Socket; ms: number } => client !== null);
  console.log(`Tersambung: ${connected.length}/${options.clients} dalam ${(performance.now() - startedAt).toFixed(0)}ms (${summary(connected.map((c) => c.ms))})`);

  const sentAt = new Map<string, number>();
  const results: AckResult[] = [];
  for (let round = 0; round < options.rounds; round++) {
    const batch = await Promise.all(
      connected.map((client, index) => {
        const text = `${options.prefix}${runId}${letters(index)}z${letters(round)}`;
        sentAt.set(text, performance.now());
        return submit(client.socket, text);
      }),
    );
    results.push(...batch);
    if (round < options.rounds - 1) await new Promise((resolve) => setTimeout(resolve, options.gapMs));
  }
  await new Promise((resolve) => setTimeout(resolve, 3000));

  const shown = results.filter((result) => result.status === "shown" || result.status === "pending");
  const rejected = results.filter((result) => result.status === "rejected");
  const timeouts = results.filter((result) => result.status === "timeout");
  const reasons = new Map<string, number>();
  for (const result of rejected) reasons.set(result.reason ?? "?", (reasons.get(result.reason ?? "?") ?? 0) + 1);
  const delivered = [...sentAt.entries()].filter(([text]) => arrivedAt.has(text)).map(([text, sent]) => (arrivedAt.get(text) ?? sent) - sent);

  console.log(`Diterima: ${shown.length}/${results.length}, ditolak: ${rejected.length} ${JSON.stringify(Object.fromEntries(reasons))}, timeout: ${timeouts.length}`);
  console.log(`Waktu ack: ${summary(shown.map((result) => result.ms))}`);
  console.log(`Tiba di display: ${summary(delivered)}`);

  for (const client of connected) client.socket.disconnect();
  display.socket.disconnect();

  const healthy = timeouts.length === 0 && connected.length === options.clients && shown.length + rejected.length === results.length;
  console.log(healthy ? "HASIL: lulus" : "HASIL: ada masalah, periksa angka di atas");
  process.exit(healthy ? 0 : 1);
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exit(1);
});
