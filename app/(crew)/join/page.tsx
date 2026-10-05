import type { Metadata } from "next";
import { JoinForm } from "@/components/join-form";

export const metadata: Metadata = { title: "Join Session" };

export default function JoinPage() {
  return <JoinForm />;
}
