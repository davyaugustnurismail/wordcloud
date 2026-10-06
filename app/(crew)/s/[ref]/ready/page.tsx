import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReadyView } from "@/components/ready-view";
import { openReadyToken, readyCookieName } from "@/lib/auth/ready-cookie";
import { resolveRequestOrigin } from "@/lib/origin";
import { qrSvg } from "@/lib/qr";
import { loadSession } from "@/lib/session-page";
import { sessionRef } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Siap tayang" };

export default async function ReadyPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSession((await params).ref);

  const cookieStore = await cookies();
  const ready = await openReadyToken(cookieStore.get(readyCookieName(session.code))?.value, session.code);
  if (!ready) redirect("/create");

  const origin = await resolveRequestOrigin();
  const ref = sessionRef(session);
  const inputUrl = `${origin}/s/${ref}/input`;
  const [joinQr, adminQr] = await Promise.all([qrSvg(inputUrl), qrSvg(`${origin}/s/${session.code}/admin`)]);

  return (
    <ReadyView
      code={session.code}
      sessionRef={ref}
      name={session.name}
      pin={ready.pin}
      joinLabel={`${new URL(origin).host}/join`}
      inputUrl={inputUrl}
      displayUrl={`${origin}/s/${ref}/display`}
      joinQr={joinQr}
      adminQr={adminQr}
    />
  );
}
