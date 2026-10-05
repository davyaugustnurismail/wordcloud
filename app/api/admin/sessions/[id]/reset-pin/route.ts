import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { disconnectSessionAdmins } from "@/lib/realtime/disconnect-admins";
import { findSessionById, resetSessionPin } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const { id } = await context.params;
  if (!z.uuid().safeParse(id).success) return jsonError("not_found", 404);
  const session = await findSessionById(id);
  if (!session) return jsonError("not_found", 404);

  const pin = await resetSessionPin(session.id);
  await disconnectSessionAdmins(session.id);
  return NextResponse.json({ code: session.code, pin });
}
