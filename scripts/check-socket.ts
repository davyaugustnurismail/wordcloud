import { io } from "socket.io-client";

const args = process.argv.slice(2);
const originFlag = args.indexOf("--origin");
const origin = originFlag >= 0 ? args[originFlag + 1] : undefined;
const url =
  args.find((arg, i) => !arg.startsWith("--") && (originFlag < 0 || i !== originFlag + 1)) ?? "http://localhost:3000";

const socket = io(url, {
  transports: ["websocket"],
  reconnection: false,
  timeout: 5000,
  extraHeaders: origin ? { Origin: origin } : undefined,
});

const fail = (message: string) => {
  console.error(`GAGAL ${url}${origin ? ` (Origin: ${origin})` : ""}: ${message}`);
  process.exit(1);
};

socket.on("connect_error", (err) => fail(err.message));
socket.on("connect", () => {
  const sentAt = performance.now();
  socket.emit("ping:check", () => {
    const rtt = Math.round(performance.now() - sentAt);
    console.log(`OK ${url}${origin ? ` (Origin: ${origin})` : ""}: websocket terhubung, ack ${rtt} ms`);
    socket.disconnect();
    process.exit(0);
  });
});
