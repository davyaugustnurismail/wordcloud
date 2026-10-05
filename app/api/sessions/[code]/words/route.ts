import { NextResponse } from "next/server";
import { requireSessionAdmin } from "@/lib/api-guards";
import { listVisibleEntries } from "@/lib/entries";

export const dynamic = "force-dynamic";

const WORD_LIMIT = 1000;

export async function GET(_request: Request, context: { params: Promise<{ code: string }> }) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;

  const { session } = auth;
  const entries = await listVisibleEntries(session.id, session.state.clearedAt, WORD_LIMIT);
  return NextResponse.json(
    { name: session.name, code: session.code, settings: session.settings, entries },
    { headers: { "Cache-Control": "no-store" } },
  );
}
