import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    server: "server.ts",
    migrate: "lib/db/migrate.ts",
    hash: "scripts/hash-password.ts",
  },
  format: ["esm"],
  platform: "node",
  target: "node22",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
});
