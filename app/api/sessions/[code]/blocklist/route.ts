import { NextResponse } from "next/server";
import { z } from "zod";
import { hasAdminAccess } from "@/lib/auth/access";
import { addSessionTerm, listGlobalTerms, listSessionTerms, removeSessionTerm } from "@/lib/blocklist";
import { isValidCode, normalizeCode } from "@/lib/code";
import { findSessionByCode } from "@/lib/sessions";
import { checkWord, normalizeWord } from "@/lib/words";

export const dynamic = "force-dynamic";

const MAX_TERM_CHARS = 40;
const bodySchema = z.object({ term: z.string().max(200) });

type Context = { params: Promise<{ code: string }> };

async function authorize(context: Context) {
  const code = normalizeCode((await context.params).code);
  if (!isValidCode(code)) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  if (!(await hasAdminAccess(code))) return { error: NextResponse.json({ error: "unauthorized" }, { status: 401 }) };
  const session = await findSessionByCode(code);
  if (!session) return { error: NextResponse.json({ error: "not_found" }, { status: 404 }) };
  return { session };
}

async function readTerm(request: Request): Promise<string | null> {
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return null;
  const checked = checkWord(body.data.term, MAX_TERM_CHARS);
  return checked.ok ? normalizeWord(checked.text) : null;
}

export async function GET(_request: Request, context: Context) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  const [terms, global] = await Promise.all([listSessionTerms(auth.session.id), listGlobalTerms()]);
  return NextResponse.json({ terms, global });
}

export async function POST(request: Request, context: Context) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  const term = await readTerm(request);
  if (!term) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const added = await addSessionTerm(auth.session.id, term);
  return NextResponse.json({ added, terms: await listSessionTerms(auth.session.id) });
}

export async function DELETE(request: Request, context: Context) {
  const auth = await authorize(context);
  if (auth.error) return auth.error;
  const term = await readTerm(request);
  if (!term) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const removed = await removeSessionTerm(auth.session.id, term);
  return NextResponse.json({ removed, terms: await listSessionTerms(auth.session.id) });
}
