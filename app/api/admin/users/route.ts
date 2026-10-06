import { NextResponse } from "next/server";
import { z } from "zod";
import { addAdminUser, listAdminUsers } from "@/lib/admin-users";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { getGlobalAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  email: z.string().trim().toLowerCase().max(200).pipe(z.email()),
  name: z.string().trim().max(80).optional(),
});

export async function GET() {
  const denied = await requireGlobal();
  if (denied) return denied;
  return NextResponse.json({ users: await listAdminUsers() }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);

  const actor = await getGlobalAccess();
  const created = await addAdminUser({
    email: body.data.email,
    name: body.data.name || null,
    createdBy: actor?.email ?? "password",
  });
  if (!created) return jsonError("exists", 409);
  return NextResponse.json({ user: created, users: await listAdminUsers() }, { status: 201 });
}
