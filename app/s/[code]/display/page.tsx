import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Photowall } from "@/components/photowall";
import { isValidCode, normalizeCode } from "@/lib/code";
import { findSessionByCode } from "@/lib/sessions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Photowall" };

export default async function DisplayPage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) notFound();

  return <Photowall code={code} initialSettings={session.settings} />;
}
