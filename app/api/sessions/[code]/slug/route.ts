import { NextResponse } from "next/server";
import { z } from "zod";
import { jsonError, requireSessionAdmin } from "@/lib/api-guards";
import { checkSlugAvailability, SlugTakenError, updateSessionSlug } from "@/lib/sessions";
import { slugProblem } from "@/lib/slug";

export const dynamic = "force-dynamic";

const bodySchema = z.object({ slug: z.string().trim().toLowerCase().max(80) });

export async function PUT(request: Request, context: { params: Promise<{ code: string }> }) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;

  const body = bodySchema.safeParse(await request.json().catch(() => null));
  if (!body.success || slugProblem(body.data.slug) !== null) return jsonError("invalid", 400);

  const check = await checkSlugAvailability(body.data.slug, auth.session.id);
  if (!check.available) return jsonError("slug_taken", 409);

  try {
    const updated = await updateSessionSlug(auth.session.id, body.data.slug);
    return NextResponse.json({ slug: updated.slug });
  } catch (err) {
    if (err instanceof SlugTakenError) return jsonError("slug_taken", 409);
    throw err;
  }
}
