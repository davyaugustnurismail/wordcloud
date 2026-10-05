import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { addTerm, listTerms, removeTerm } from "@/lib/blocklist";
import { findSessionById } from "@/lib/sessions";
import { checkWord, normalizeWord } from "@/lib/words";

export const dynamic = "force-dynamic";

const MAX_TERM_CHARS = 40;

const scopeSchema = z.union([z.literal("global"), z.uuid()]);
const bodySchema = z.object({ term: z.string().max(200), scope: scopeSchema });

async function resolveScope(scope: string): Promise<{ sessionId: string | null } | null> {
  if (scope === "global") return { sessionId: null };
  const session = await findSessionById(scope);
  return session ? { sessionId: session.id } : null;
}

async function readBody(request: Request) {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return null;
  const checked = checkWord(body.data.term, MAX_TERM_CHARS);
  if (!checked.ok) return null;
  const target = await resolveScope(body.data.scope);
  return target ? { term: normalizeWord(checked.text), sessionId: target.sessionId } : null;
}

export async function GET(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const scope = scopeSchema.safeParse(new URL(request.url).searchParams.get("scope") ?? "global");
  const target = scope.success ? await resolveScope(scope.data) : null;
  if (!target) return jsonError("not_found", 404);
  return NextResponse.json({ terms: await listTerms(target.sessionId) });
}

export async function POST(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const body = await readBody(request);
  if (!body) return jsonError("invalid", 400);
  const added = await addTerm(body.sessionId, body.term);
  return NextResponse.json({ added, terms: await listTerms(body.sessionId) });
}

export async function DELETE(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const body = await readBody(request);
  if (!body) return jsonError("invalid", 400);
  const removed = await removeTerm(body.sessionId, body.term);
  return NextResponse.json({ removed, terms: await listTerms(body.sessionId) });
}
