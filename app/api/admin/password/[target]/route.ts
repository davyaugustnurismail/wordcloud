import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { setCreatorPassword } from "@/lib/app-settings";

export const dynamic = "force-dynamic";

const MIN_PASSWORD_LENGTH = 8;

const bodySchema = z
  .object({
    password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
    confirm: z.string().max(200),
  })
  .refine((value) => value.password === value.confirm);

export async function POST(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);
  await setCreatorPassword(body.data.password);
  return NextResponse.json({ ok: true });
}
