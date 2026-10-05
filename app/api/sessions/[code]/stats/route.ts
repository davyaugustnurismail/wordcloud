import { NextResponse } from "next/server";
import { requireSessionAdmin } from "@/lib/api-guards";
import { loadSessionStats } from "@/lib/stats";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;
  return NextResponse.json(await loadSessionStats(auth.session.id), { headers: { "Cache-Control": "no-store" } });
}
