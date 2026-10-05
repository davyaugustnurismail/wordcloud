import { NextResponse } from "next/server";
import { getPool } from "@/lib/db";
import { summarizeMetrics } from "@/lib/metrics";
import { getRedis } from "@/lib/redis";

export const dynamic = "force-dynamic";

const CHECK_TIMEOUT_MS = 2000;

type CheckResult = "ok" | "down";

async function check(probe: () => Promise<unknown>): Promise<CheckResult> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("timeout")), CHECK_TIMEOUT_MS);
  });
  try {
    await Promise.race([probe(), timeout]);
    return "ok";
  } catch {
    return "down";
  } finally {
    clearTimeout(timer);
  }
}

export async function GET() {
  const [db, redis] = await Promise.all([
    check(() => getPool().query("select 1")),
    check(() => getRedis().ping()),
  ]);

  const healthy = db === "ok" && redis === "ok";
  return NextResponse.json(
    { status: healthy ? "ok" : "degraded", server: "ok", db, redis, uptimeSec: Math.round(process.uptime()), metrics: summarizeMetrics() },
    { status: healthy ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
