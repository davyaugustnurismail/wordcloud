import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { ReadyView } from "@/components/ready-view";
import { openReadyToken, readyCookieName } from "@/lib/auth/ready-cookie";
import { isValidCode, normalizeCode } from "@/lib/code";
import { resolveRequestOrigin } from "@/lib/origin";
import { qrSvg } from "@/lib/qr";
import { findSessionByCode } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Siap tayang" };

export default async function ReadyPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) notFound();

  const cookieStore = await cookies();
  const ready = await openReadyToken(cookieStore.get(readyCookieName(code))?.value, code);
  if (!ready) redirect("/create");

  const origin = await resolveRequestOrigin();
  const [joinQr, adminQr] = await Promise.all([
    qrSvg(`${origin}/s/${code}/input`),
    qrSvg(`${origin}/s/${code}/admin`),
  ]);

  return (
    <ReadyView
      code={code}
      name={session.name}
      pin={ready.pin}
      joinLabel={`${new URL(origin).host}/join`}
      joinQr={joinQr}
      adminQr={adminQr}
    />
  );
}
