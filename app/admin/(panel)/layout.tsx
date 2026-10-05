import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlobalShell } from "@/components/global/global-shell";
import { hasGlobalAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Admin global" };

export default async function GlobalPanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await hasGlobalAccess())) redirect("/admin/login");
  return <GlobalShell>{children}</GlobalShell>;
}
