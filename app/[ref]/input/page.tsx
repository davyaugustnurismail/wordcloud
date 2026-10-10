import type { Metadata } from "next";
import { InputKiosk } from "@/components/input-kiosk";
import { InputPinGate } from "@/components/input-pin-gate";
import { hasInputAccess } from "@/lib/auth/access";
import { loadSession } from "@/lib/session-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Input kata" };

export default async function InputPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSession((await params).ref);

  if (!(await hasInputAccess(session))) {
    return <InputPinGate code={session.code} settings={session.settings} />;
  }
  return <InputKiosk code={session.code} initialSettings={session.settings} />;
}
