import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSessionAdmin } from "@/lib/api-guards";
import { disconnectSessionInputs } from "@/lib/realtime/disconnect-admins";
import { readInputAccess, updateInputAccess } from "@/lib/sessions";

export const dynamic = "force-dynamic";

const bodySchema = z
  .object({
    enabled: z.boolean().optional(),
    pin: z.string().regex(/^\d{4,6}$/).optional(),
    regenerate: z.boolean().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0);

type Context = { params: Promise<{ code: string }> };

const noStore = { headers: { "Cache-Control": "no-store" } };

export async function GET(_request: Request, context: Context) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;

  const access = await readInputAccess(auth.session.id);
  if (!access) return jsonError("not_found", 404);
  return NextResponse.json(access, noStore);
}

export async function PUT(request: Request, context: Context) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);

  const before = await readInputAccess(auth.session.id);
  const after = await updateInputAccess(auth.session.id, body.data);
  if (!before || !after) return jsonError("not_found", 404);

  if (after.enabled && (!before.enabled || after.pin !== before.pin)) {
    await disconnectSessionInputs(auth.session.id);
  }
  return NextResponse.json(after, noStore);
}
