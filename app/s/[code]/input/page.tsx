import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InputKiosk } from "@/components/input-kiosk";
import { isValidCode, normalizeCode } from "@/lib/code";
import { findSessionByCode } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Input kata" };

export default async function InputPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) notFound();

  return <InputKiosk code={code} initialSettings={session.settings} />;
}
