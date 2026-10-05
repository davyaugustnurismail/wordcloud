import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { readStoredPassword, setPassword } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

const targetSchema = z.enum(["creator", "global"]);

const bodySchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
    confirm: z.string().max(200),
  })
  .refine((value) => value.password === value.confirm);

type Context = { params: Promise<{ target: string }> };

export async function GET(_request: Request, context: Context) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const target = targetSchema.safeParse((await context.params).target);
  if (!target.success) return jsonError("not_found", 404);

  const password = await readStoredPassword(target.data);
  return NextResponse.json({ password }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request, context: Context) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const target = targetSchema.safeParse((await context.params).target);
  if (!target.success) return jsonError("not_found", 404);

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);
  await setPassword(target.data, body.data.password);
  return NextResponse.json({ ok: true });
}
