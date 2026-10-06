import { AccessSettings } from "@/components/admin/access-settings";
import { resolveRequestOrigin } from "@/lib/origin";
import { qrSvg } from "@/lib/qr";
import { loadSessionForAdmin } from "@/lib/session-page";
import { readInputAccess, sessionRef } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSessionForAdmin((await params).ref);
  const origin = await resolveRequestOrigin();
  const access = (await readInputAccess(session.id)) ?? { enabled: false, pin: null };
  const inputQr = await qrSvg(`${origin}/s/${sessionRef(session)}/input`);

  return <AccessSettings origin={origin} slug={session.slug} initialAccess={access} inputQr={inputQr} />;
}
