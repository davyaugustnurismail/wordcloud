import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { readStoredPin } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonError("not_found", 404);

  const pin = await readStoredPin(id);
  if (pin === undefined) return jsonError("not_found", 404);
  return NextResponse.json({ pin }, { headers: { "Cache-Control": "no-store" } });
}
