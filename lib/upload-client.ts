import { uploadErrorMessage } from "./image-file";

export type UploadKind = "photowall_bg" | "input_bg";

export type UploadResult = { ok: true; id: string } | { ok: false; message: string };

export async function uploadSessionImage(code: string, kind: UploadKind, file: File): Promise<UploadResult> {
  const body = new FormData();
  body.set("code", code);
  body.set("kind", kind);
  body.set("file", file);

  try {
    const response = await fetch("/api/uploads", { method: "POST", body });
    if (!response.ok) return { ok: false, message: uploadErrorMessage(response.status) };
    const result = (await response.json()) as { id: string };
    return { ok: true, id: result.id };
  } catch {
    return { ok: false, message: "Tidak bisa menghubungi server. Coba lagi." };
  }
}
