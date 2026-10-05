import { defineConfig } from "drizzle-kit";
import "./lib/load-env";

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://wordcloud:wordcloud@localhost:5432/wordcloud",
  },
});
