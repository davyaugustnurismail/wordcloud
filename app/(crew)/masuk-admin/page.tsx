import type { Metadata } from "next";
import { AdminLoginForm } from "@/components/admin-login-form";

export const metadata: Metadata = { title: "Masuk admin sesi" };

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ kode?: string }> }) {
  const { kode } = await searchParams;
  return <AdminLoginForm initialCode={typeof kode === "string" ? kode : ""} />;
}
