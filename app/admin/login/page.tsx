import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GlobalLoginForm } from "@/components/global/global-login-form";
import { ThemeToggle } from "@/components/theme-toggle";
import { hasGlobalAccess } from "@/lib/auth/access";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Login admin global" };

export default async function GlobalLoginPage() {
  if (await hasGlobalAccess()) redirect("/admin");

  return (
    <div className="flex min-h-view flex-col bg-bg text-fg">
      <header className="flex items-center justify-end px-[18px] py-3.5 sm:px-8 sm:py-4">
        <ThemeToggle />
      </header>
      <GlobalLoginForm />
    </div>
  );
}
