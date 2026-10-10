import type { Metadata } from "next";
import { Photowall } from "@/components/photowall";
import { loadSession } from "@/lib/session-page";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Photowall" };

export default async function DisplayPage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSession((await params).ref);
  return <Photowall code={session.code} initialSettings={session.settings} />;
}
