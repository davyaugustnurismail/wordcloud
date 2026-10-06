import { z } from "zod";

function decodeHash(value: string): string {
  return value.startsWith("b64:") ? Buffer.from(value.slice(4), "base64").toString("utf8") : value;
}

const schema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  HOST: z.string().min(1).default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.string().min(1),
  DB_POOL_MAX: z.coerce.number().int().min(2).max(80).default(20),
  REDIS_URL: z.string().min(1),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET minimal 32 karakter"),
  ADMIN_PASSWORD_HASH: z.string().min(1).transform(decodeHash),
  CREATOR_PASSWORD_HASH: z.string().min(1).transform(decodeHash),
  GOOGLE_CLIENT_ID: z.string().trim().optional(),
  GOOGLE_CLIENT_SECRET: z.string().trim().optional(),
  PUBLIC_URL: z.url().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().min(1).default("./data/uploads"),
  ALLOW_LAN_ORIGINS: z.enum(["true", "false"]).optional(),
  TRUST_PROXY: z.enum(["true", "false"]).optional(),
});

export type Env = Omit<z.infer<typeof schema>, "ALLOW_LAN_ORIGINS" | "TRUST_PROXY"> & {
  ALLOW_LAN_ORIGINS: boolean;
  TRUST_PROXY: boolean;
};

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".") || "(env)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Environment tidak valid. Salin .env.example ke .env lalu isi:\n${detail}`);
  }

  const { ALLOW_LAN_ORIGINS, TRUST_PROXY, ...rest } = parsed.data;
  cached = {
    ...rest,
    ALLOW_LAN_ORIGINS: ALLOW_LAN_ORIGINS ? ALLOW_LAN_ORIGINS === "true" : rest.NODE_ENV !== "production",
    TRUST_PROXY: TRUST_PROXY === "true",
  };
  return cached;
}

export type GoogleConfig = { clientId: string; clientSecret: string; redirectUri: string };

export function getGoogleConfig(): GoogleConfig | null {
  const env = getEnv();
  if (!env.GOOGLE_CLIENT_ID || !env.GOOGLE_CLIENT_SECRET) return null;
  return {
    clientId: env.GOOGLE_CLIENT_ID,
    clientSecret: env.GOOGLE_CLIENT_SECRET,
    redirectUri: `${new URL(env.PUBLIC_URL).origin}/api/auth/google/callback`,
  };
}
