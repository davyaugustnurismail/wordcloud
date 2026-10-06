import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { GlobalLoginForm } from "@/components/global/global-login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasGlobalAccess } from "@/lib/auth/access";
import { getGoogleConfig } from "@/lib/env";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login admin global" };

export default async function GlobalLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await hasGlobalAccess()) redirect("/admin");
  const { error } = await searchParams;

  return (
    <div className="flex min-h-view flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-[18px] py-3.5 sm:px-8 sm:py-4">
        <BrandLogo height={44} />
        <ThemeToggle />
      </header>
      <GlobalLoginForm googleEnabled={getGoogleConfig() !== null} initialError={typeof error === "string" ? error : null} />
    </div>
  );
}
