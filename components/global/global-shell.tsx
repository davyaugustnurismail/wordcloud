"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BanIcon, BarsIcon, ImageIcon, LockIcon, ShieldIcon, SlidersIcon } from "../icons";
import { ThemeToggle } from "../theme-toggle";

type NavItem = { href: string; hash?: string; label: string; icon: ReactNode };

const navItems: NavItem[] = [
  { href: "/admin", label: "Dashboard & sesi", icon: <BarsIcon size={18} /> },
  { href: "/admin/blocklist", label: "Blocklist kata", icon: <BanIcon size={18} /> },
  { href: "/admin/settings", hash: "#default", label: "Default sesi baru", icon: <SlidersIcon size={18} /> },
  { href: "/admin/settings", hash: "#gambar", label: "Pustaka gambar", icon: <ImageIcon size={18} /> },
  { href: "/admin/settings", hash: "#password", label: "Password pembuat", icon: <LockIcon size={18} /> },
];

function useHash(): string {
  const [hash, setHash] = useState("");
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    update();
    window.addEventListener("hashchange", update);
    return () => window.removeEventListener("hashchange", update);
  }, []);
  return hash;
}

export function GlobalShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const hash = useHash();

  const logout = async () => {
    try {
      await fetch("/api/admin/logout", { method: "POST" });
    } finally {
      router.push("/admin/login");
      router.refresh();
    }
  };

  const isActive = (item: NavItem) => {
    if (pathname !== item.href) return false;
    if (!item.hash) return true;
    return hash === item.hash || (hash === "" && item.hash === "#default");
  };

  return (
    <div className="flex min-h-view flex-col bg-bg text-fg">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-line px-4 py-3.5 md:px-8">
        <span className="flex h-7 items-center gap-1.5 rounded-full bg-surface2 px-2.5 text-xs font-extrabold tracking-[0.06em]">
          <ShieldIcon size={14} strokeWidth={2.2} />
          ADMIN GLOBAL
        </span>
        <div className="flex items-center gap-2.5">
          <ThemeToggle iconOnly />
          <button
            type="button"
            onClick={logout}
            className="flex h-10 items-center rounded-full border border-line px-3.5 text-sm font-bold text-fg"
          >
            Keluar
          </button>
        </div>
      </header>
      <div className="flex flex-1 flex-wrap items-start">
        <nav
          aria-label="Menu admin global"
          className="box-border flex max-w-full flex-[1_1_220px] gap-1 overflow-x-auto px-3 py-3 md:flex-col md:overflow-visible md:px-4 md:py-5"
        >
          {navItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.label}
                href={`${item.href}${item.hash ?? ""}`}
                aria-current={active ? "page" : undefined}
                className={`flex h-11 shrink-0 items-center gap-2.5 whitespace-nowrap rounded-[10px] px-3 text-[15px] ${
                  active ? "bg-primary font-extrabold text-on-primary" : "font-semibold text-fg"
                }`}
              >
                {item.icon}
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-[999_1_640px] flex-col">{children}</div>
      </div>
    </div>
  );
}
