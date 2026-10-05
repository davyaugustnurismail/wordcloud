import { NextResponse } from "next/server";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { buildAllExport, type ExportFormat } from "@/lib/export";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const format = new URL(request.url).searchParams.get("format");
  if (format !== "csv" && format !== "json") return jsonError("invalid", 400);

  const file = await buildAllExport(format as ExportFormat);
  return new NextResponse(file.body, {
    headers: {
      "Content-Type": file.contentType,
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
