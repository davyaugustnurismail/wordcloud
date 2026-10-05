import "./lib/load-env";
import { createServer } from "node:http";
import next from "next";
import { getEnv } from "./lib/env";
import { attachRealtime } from "./lib/realtime/server";

async function main() {
  const env = getEnv();
  const dev = env.NODE_ENV !== "production";

  const httpServer = createServer((req, res) => {
    void handle(req, res);
  });
  const app = next({ dev, hostname: env.HOST, port: env.PORT, httpServer });
  const handle = app.getRequestHandler();
  await app.prepare();

  const io = attachRealtime(httpServer);

  httpServer.listen(env.PORT, env.HOST, () => {
    console.log(`> Siap di http://${env.HOST === "0.0.0.0" ? "localhost" : env.HOST}:${env.PORT} (${dev ? "dev" : "produksi"})`);
  });

  const shutdown = (signal: string) => {
    console.log(`> ${signal} diterima, menutup server...`);
    void io.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
