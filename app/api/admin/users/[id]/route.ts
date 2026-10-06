import { NextResponse } from "next/server";
import { z } from "zod";
import { deleteAdminUser, listAdminUsers, setAdminUserActive } from "@/lib/admin-users";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { getGlobalAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ active: z.boolean() });

type Context = { params: Promise<{ id: string }> };

async function parseTarget(context: Context): Promise<{ id: string; isSelf: boolean } | null> {
  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return null;
  const actor = await getGlobalAccess();
  return { id, isSelf: actor?.userId === id };
}

export async function PATCH(request: Request, context: Context) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const target = await parseTarget(context);
  if (!target) return jsonError("not_found", 404);
  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);
  if (target.isSelf && !body.data.active) return jsonError("self", 400);

  const updated = await setAdminUserActive(target.id, body.data.active);
  if (!updated) return jsonError("not_found", 404);
  return NextResponse.json({ users: await listAdminUsers() });
}

export async function DELETE(_request: Request, context: Context) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const target = await parseTarget(context);
  if (!target) return jsonError("not_found", 404);
  if (target.isSelf) return jsonError("self", 400);

  if (!(await deleteAdminUser(target.id))) return jsonError("not_found", 404);
  return NextResponse.json({ users: await listAdminUsers() });
}
