import { NextResponse } from "next/server";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { getSessionDefaults, saveSessionDefaults } from "@/lib/app-settings";
import { sessionDefaultsSchema } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireGlobal();
  if (denied) return denied;
  return NextResponse.json(await getSessionDefaults());
}

export async function PUT(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const body = sessionDefaultsSchema.strict().safeParse(await request.json().catch(() => null));
  if (!body.success) return jsonError("invalid", 400);
  await saveSessionDefaults(body.data);
  return NextResponse.json(body.data);
}
