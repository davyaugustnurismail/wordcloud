import Link from "next/link";
import { BrandLogo } from "@/components/brand-logo";
import { ThemeToggle } from "@/components/theme-toggle";

export default function CrewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-view flex-col bg-bg text-fg">
      <header className="flex items-center justify-between px-[18px] py-3.5 sm:px-8 sm:py-4">
        <Link href="/" aria-label="Ke beranda">
          <BrandLogo height={44} />
        </Link>
        <ThemeToggle />
      </header>
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
