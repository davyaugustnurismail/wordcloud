import { NextResponse } from "next/server";
import { hasAdminAccess } from "@/lib/auth/access";
import { isValidCode, normalizeCode } from "@/lib/code";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { findSessionByCode } from "@/lib/sessions";
import { isUploadedFile, prepareImage, storeImage, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const KINDS = ["photowall_bg", "input_bg"] as const;

export async function POST(request: Request) {
  const form = await request.formData().catch(() => null);
  const code = normalizeCode(String(form?.get("code") ?? ""));
  const kind = KINDS.find((candidate) => candidate === form?.get("kind"));
  const file = form?.get("file");
  if (!form || !isValidCode(code) || !kind || !isUploadedFile(file)) {
    return NextResponse.json({ error: "invalid" }, { status: 400 });
  }

  if (!(await hasAdminAccess(code))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const session = await findSessionByCode(code);
  if (!session) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const limit = await hitRateLimit(`upload:${clientIp(request.headers)}`, 20, 60);
  if (!limit.allowed) {
    return NextResponse.json(
      { error: "rate_limited" },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  try {
    const asset = await storeImage(await prepareImage(file), { sessionId: session.id, kind });
    return NextResponse.json({ id: asset.id, kind: asset.kind }, { status: 201 });
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.reason }, { status: err.reason === "too_large" ? 413 : 400 });
    }
    throw err;
  }
}
