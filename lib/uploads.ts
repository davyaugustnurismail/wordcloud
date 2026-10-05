import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { createAsset, type AssetKind, type AssetRecord } from "./assets";
import { getEnv } from "./env";

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
export const MAX_IMAGE_WIDTH = 1920;

const ALLOWED_FORMATS = new Set(["jpeg", "png", "webp"]);
const MAX_INPUT_PIXELS = 80_000_000;
const JPEG_QUALITY = 82;

export type UploadFailure = "empty" | "too_large" | "unsupported";

export class UploadError extends Error {
  constructor(public readonly reason: UploadFailure) {
    super(`Upload gagal: ${reason}`);
  }
}

export function uploadRoot(): string {
  return path.resolve(getEnv().UPLOAD_DIR);
}

export function resolveAssetPath(relativePath: string): string | null {
  const root = uploadRoot();
  const resolved = path.resolve(root, relativePath);
  return resolved.startsWith(root + path.sep) ? resolved : null;
}

export function isUploadedFile(value: unknown): value is File {
  return typeof value === "object" && value !== null && typeof (value as File).arrayBuffer === "function" && (value as File).size > 0;
}

export async function prepareImage(file: File): Promise<Buffer> {
  if (file.size === 0) throw new UploadError("empty");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("too_large");

  const input = Buffer.from(await file.arrayBuffer());
  try {
    const image = sharp(input, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    const metadata = await image.metadata();
    if (!metadata.format || !ALLOWED_FORMATS.has(metadata.format)) throw new UploadError("unsupported");
    return await image
      .rotate()
      .resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true })
      .jpeg({ quality: JPEG_QUALITY })
      .toBuffer();
  } catch (err) {
    if (err instanceof UploadError) throw err;
    throw new UploadError("unsupported");
  }
}

export async function storeImage(buffer: Buffer, target: { sessionId: string; kind: AssetKind }): Promise<AssetRecord> {
  const relativePath = path.posix.join("sessions", target.sessionId, `${randomUUID()}.jpg`);
  const absolutePath = resolveAssetPath(relativePath);
  if (!absolutePath) throw new Error("Path upload tidak valid");
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  return createAsset({ sessionId: target.sessionId, kind: target.kind, path: relativePath });
}

function slugify(name: string): string {
  const base = name.replace(/\.[^.]+$/, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return base.slice(0, 40) || "gambar";
}

export async function storeLibraryImage(buffer: Buffer, originalName: string): Promise<AssetRecord[]> {
  const relativePath = path.posix.join("library", `${slugify(originalName)}-${randomUUID().slice(0, 8)}.jpg`);
  const absolutePath = resolveAssetPath(relativePath);
  if (!absolutePath) throw new Error("Path upload tidak valid");
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer);
  const photowall = await createAsset({ sessionId: null, kind: "photowall_bg", path: relativePath });
  const input = await createAsset({ sessionId: null, kind: "input_bg", path: relativePath });
  return [photowall, input];
}
