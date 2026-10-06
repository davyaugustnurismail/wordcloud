import { NextResponse } from "next/server";
import { jsonError, requireSessionAdmin } from "@/lib/api-guards";
import { addTerms, listSessionTerms } from "@/lib/blocklist";
import { bulkBodySchema, splitBulkTerms } from "@/lib/blocklist-bulk";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ code: string }> }) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;

  const body = bulkBodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);

  const { terms, invalid } = splitBulkTerms(body.data.terms);
  if (terms.length === 0) return jsonError("invalid", 400);

  const added = await addTerms(auth.session.id, terms);
  return NextResponse.json({
    added,
    skipped: terms.length - added,
    invalid,
    terms: await listSessionTerms(auth.session.id),
  });
}
