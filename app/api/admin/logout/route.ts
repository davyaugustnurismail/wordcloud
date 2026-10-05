import { NextResponse } from "next/server";
import { GLOBAL_COOKIE_NAME, globalCookieOptions } from "@/lib/auth/global-cookie";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(GLOBAL_COOKIE_NAME, "", { ...globalCookieOptions(), maxAge: 0 });
  return response;
}
