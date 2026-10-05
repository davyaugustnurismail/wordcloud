import { NextResponse } from "next/server";
import { z } from "zod";
import { isAssetUsable } from "@/lib/assets";
import { readyCookieName, readyCookieOptions, sealReadyToken } from "@/lib/auth/ready-cookie";
import { clientIp } from "@/lib/http";
import { hitRateLimit } from "@/lib/rate-limit";
import { getSessionDefaults, verifyCreatorPassword } from "@/lib/app-settings";
import { createSession, updateSessionSettings } from "@/lib/sessions";
import {
  defaultSettings,
  hexColor,
  inputBoxStyles,
  inputThemes,
  MAX_PALETTE_COLORS,
  moderationModes,
  photowallThemes,
} from "@/lib/settings";
import { isUploadedFile, prepareImage, storeImage, UploadError } from "@/lib/uploads";

export const dynamic = "force-dynamic";

const blankToUndefined = (value: unknown) => (value === "" ? undefined : value);

const optionalId = z.preprocess(blankToUndefined, z.uuid().optional());
const optionalColor = z.preprocess(blankToUndefined, hexColor.optional());
const optionalOverlay = z.preprocess(blankToUndefined, z.coerce.number().int().min(0).max(85).optional());
const optionalPalette = z.preprocess((value) => {
  if (value === "" || value === undefined) return undefined;
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}, z.array(hexColor).min(1).max(MAX_PALETTE_COLORS).optional());

const createSchema = z.object({
  name: z.string().trim().min(1).max(60),
  password: z.string().min(1).max(200),
  moderationMode: z.enum(moderationModes).default("langsung"),
  photowallTheme: z.enum(photowallThemes),
  inputTheme: z.enum(inputThemes),
  photowallBgId: optionalId,
  inputBgId: optionalId,
  photowallColor: optionalColor,
  inputColor: optionalColor,
  photowallOverlay: optionalOverlay,
  inputOverlay: optionalOverlay,
  palette: optionalPalette,
  inputBoxStyle: z.preprocess(blankToUndefined, z.enum(inputBoxStyles).optional()),
  inputTextColor: optionalColor,
  inputFieldColor: optionalColor,
  inputFieldTextColor: optionalColor,
  inputBorderColor: optionalColor,
  inputButtonColor: optionalColor,
  prompt: z.string().trim().min(1).max(80),
  maxChars: z.coerce.number().int().min(3).max(40),
});

function definedOnly<T extends Record<string, unknown>>(value: T): Partial<T> {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as Partial<T>;
}

function fail(error: string, status: number, headers?: HeadersInit) {
  return NextResponse.json({ error }, { status, headers });
}

export async function POST(request: Request) {
  const limit = await hitRateLimit(`create:${clientIp(request.headers)}`, 10, 60);
  if (!limit.allowed) {
    return fail("rate_limited", 429, { "Retry-After": String(limit.retryAfterSec) });
  }

  const form = await request.formData().catch(() => null);
  const parsed = createSchema.safeParse(form ? Object.fromEntries(form) : {});
  if (!form || !parsed.success) return fail("invalid", 400);

  const { password, photowallBgId, inputBgId, ...rest } = parsed.data;
  if (!(await verifyCreatorPassword(password))) return fail("password", 401);

  const photowallFile = form.get("photowallImage");
  const inputFile = form.get("inputImage");

  let photowallImage: Buffer | null = null;
  let inputImage: Buffer | null = null;
  try {
    if (isUploadedFile(photowallFile)) photowallImage = await prepareImage(photowallFile);
    if (isUploadedFile(inputFile)) inputImage = await prepareImage(inputFile);
  } catch (err) {
    if (err instanceof UploadError) return fail(err.reason, err.reason === "too_large" ? 413 : 400);
    throw err;
  }

  if (photowallBgId && !(await isAssetUsable(photowallBgId, null, "photowall_bg"))) return fail("invalid", 400);
  if (inputBgId && !(await isAssetUsable(inputBgId, null, "input_bg"))) return fail("invalid", 400);

  const settings = {
    ...defaultSettings(),
    ...(await getSessionDefaults()),
    moderationMode: rest.moderationMode,
    photowallTheme: rest.photowallTheme,
    inputTheme: rest.inputTheme,
    prompt: rest.prompt,
    maxChars: rest.maxChars,
    cardBlur: rest.inputTheme === "foto",
    photowallBgId: photowallBgId ?? null,
    inputBgId: inputBgId ?? null,
    ...definedOnly({
      photowallColor: rest.photowallColor,
      inputColor: rest.inputColor,
      photowallOverlay: rest.photowallOverlay,
      inputOverlay: rest.inputOverlay,
      palette: rest.palette,
      inputBoxStyle: rest.inputBoxStyle,
      inputTextColor: rest.inputTextColor,
      inputFieldColor: rest.inputFieldColor,
      inputFieldTextColor: rest.inputFieldTextColor,
      inputBorderColor: rest.inputBorderColor,
      inputButtonColor: rest.inputButtonColor,
    }),
  };

  const { session, pin } = await createSession({ name: rest.name, settings });

  if (photowallImage || inputImage) {
    if (photowallImage) {
      settings.photowallBgId = (await storeImage(photowallImage, { sessionId: session.id, kind: "photowall_bg" })).id;
    }
    if (inputImage) {
      settings.inputBgId = (await storeImage(inputImage, { sessionId: session.id, kind: "input_bg" })).id;
    }
    await updateSessionSettings(session.id, settings);
  }

  const response = NextResponse.json({ code: session.code }, { status: 201 });
  response.cookies.set(
    readyCookieName(session.code),
    await sealReadyToken({ code: session.code, pin }),
    readyCookieOptions(),
  );
  return response;
}
