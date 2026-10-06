import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { addTerms, listTerms } from "@/lib/blocklist";
import { bulkBodySchema, splitBulkTerms } from "@/lib/blocklist-bulk";
import { findSessionById } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const bodySchema = bulkBodySchema.extend({ scope: z.union([z.literal("global"), z.uuid()]) });

export async function POST(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);

  let sessionId: string | null = null;
  if (body.data.scope !== "global") {
    const session = await findSessionById(body.data.scope);
    if (!session) return jsonError("not_found", 404);
    sessionId = session.id;
  }

  const { terms, invalid } = splitBulkTerms(body.data.terms);
  if (terms.length === 0) return jsonError("invalid", 400);

  const added = await addTerms(sessionId, terms);
  return NextResponse.json({
    added,
    skipped: terms.length - added,
    invalid,
    terms: await listTerms(sessionId),
  });
}
