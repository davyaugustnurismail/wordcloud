import { NextResponse } from "next/server";
import { jsonError, requireSessionAdmin } from "@/lib/api-guards";
import { getDb } from "@/lib/db";
import { sessions } from "@/lib/db/schema";
import { buildSessionExport, type ExportFormat } from "@/lib/export";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(request: Request, context: { params: Promise<{ code: string }> }) {
  const auth = await requireSessionAdmin((await context.params).code);
  if (auth.error) return auth.error;

  const format = new URL(request.url).searchParams.get("format");
  if (format !== "csv" && format !== "json") return jsonError("invalid", 400);

  const [row] = await getDb().select().from(sessions).where(eq(sessions.id, auth.session.id)).limit(1);
  if (!row) return jsonError("not_found", 404);

  const file = await buildSessionExport(row, format as ExportFormat);
  return new NextResponse(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
