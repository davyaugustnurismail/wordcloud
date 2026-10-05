import { NextResponse } from "next/server";
import { jsonError, requireGlobal } from "@/lib/api-guards";
import { clientIp } from "@/lib/http";
import { libraryDisplayName } from "@/lib/library";
import { hitRateLimit } from "@/lib/rate-limit";
import { isUploadedFile, prepareImage, storeLibraryImage, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const denied = await requireGlobal();
  if (denied) return denied;

  const limit = await hitRateLimit(`library:${clientIp(request.headers)}`, 20, 60);
  if (!limit.allowed) return jsonError("rate_limited", 429, { "Retry-After": String(limit.retryAfterSec) });

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!isUploadedFile(file)) return jsonError("invalid", 400);

  try {
    const [photowall, input] = await storeLibraryImage(await prepareImage(file), file.name);
    if (!photowall || !input) throw new Error("Aset pustaka gagal dibuat");
    return NextResponse.json(
      {
        path: photowall.path,
        name: libraryDisplayName(photowall.path),
        photowallId: photowall.id,
        inputId: input.id,
        previewId: photowall.id,
        usedBy: 0,
      },
      { status: 201 },
    );
  } catch (err) {
    if (err instanceof UploadError) return jsonError(err.reason, err.reason === "too_large" ? 413 : 400);
    throw err;
  }
}
