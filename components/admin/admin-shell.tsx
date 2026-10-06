"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BrandLogo } from "../brand-logo";
import {
  BanIcon,
  ExternalLinkIcon,
  FreezeIcon,
  PauseIcon,
  PhoneIcon,
  PlayIcon,
  ScreenIcon,
  ShieldIcon,
  SlidersIcon,
  TrashIcon,
  WifiOffIcon,
} from "../icons";
import { ThemeToggle } from "../theme-toggle";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { useToast } from "../ui/toast";
import { useAdmin } from "./admin-provider";

function useStatus() {
  const { connected, state } = useAdmin();
  if (!connected) return { label: "TERPUTUS", tone: "bg-danger/15 text-danger", dot: "bg-danger" };
  if (state.ended) return { label: "SELESAI", tone: "bg-fg/10 text-muted", dot: "bg-muted" };
  if (state.frozen) return { label: "DIBEKUKAN", tone: "bg-info/15 text-info", dot: "bg-info" };
  if (state.paused) return { label: "INPUT DIJEDA", tone: "bg-warn/15 text-warn", dot: "bg-warn" };
  return { label: "LIVE", tone: "bg-live/15 text-live", dot: "bg-live" };
}

function Header() {
  const { ref, code, name, presence } = useAdmin();
  const status = useStatus();

  return (
    <header className="border-b border-line px-[18px] pb-3 pt-3.5 md:px-8 md:py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3.5">
          <BrandLogo height={34} className="hidden shrink-0 md:inline-flex" />
          <Link href={`/s/${ref}/admin`} className="truncate text-lg font-extrabold">
            {name}
          </Link>
          <span className="flex h-[26px] items-center rounded-[7px] bg-surface2 px-2 font-mono text-[13px] font-bold tracking-[0.06em] md:h-[30px] md:rounded-lg md:px-2.5 md:text-[15px] md:tracking-[0.08em]">
            {code}
          </span>
          <span
            className={`hidden h-[30px] items-center gap-[7px] rounded-full px-3 text-[13px] font-extrabold tracking-[0.04em] md:flex ${status.tone}`}
          >
            <span className={`h-2 w-2 rounded-full ${status.dot}`} />
            {status.label}
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <div className="hidden h-10 items-center gap-3.5 rounded-full border border-line px-3.5 text-[13px] font-semibold text-muted md:flex">
            <span className="flex items-center gap-1.5">
              <ScreenIcon size={16} />
              Photowall <b className="text-fg">{presence.display}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <PhoneIcon size={16} />
              Input <b className="text-fg">{presence.input}</b>
            </span>
            <span className="flex items-center gap-1.5">
              <ShieldIcon size={16} />
              Admin <b className="text-fg">{presence.admin}</b>
            </span>
          </div>
          <a
            href={`/s/${ref}/display`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Buka photowall di tab baru"
            className="flex h-10 items-center justify-center gap-2 rounded-full border border-line bg-surface px-0 text-sm font-bold text-fg max-md:w-10 md:px-3.5"
          >
            <ExternalLinkIcon size={18} />
            <span className="hidden md:inline">Photowall</span>
          </a>
          <ThemeToggle iconOnly />
        </div>
      </div>
      <div className="mt-2.5 flex items-center justify-between text-xs font-semibold text-muted md:hidden">
        <span className={`flex items-center gap-1.5 font-extrabold ${status.tone.split(" ")[1]}`}>
          <span className={`h-2 w-2 rounded-full ${status.dot}`} />
          {status.label}
        </span>
        <span>
          Photowall {presence.display} · Input {presence.input} · Admin {presence.admin}
        </span>
      </div>
    </header>
  );
}

function Tabs() {
  const { ref } = useAdmin();
  const pathname = usePathname();
  const activeRef = useRef<HTMLAnchorElement>(null);
  const base = `/s/${ref}/admin`;
  const tabs = [
    { href: base, label: "Live & moderasi" },
    { href: `${base}/tema`, label: "Tema & tampilan" },
    { href: `${base}/blocklist`, label: "Blocklist" },
    { href: `${base}/akses`, label: "Akses & tautan" },
    { href: `${base}/dashboard`, label: "Dashboard" },
    { href: `${base}/dashboard#unduh`, label: "Hasil & unduh" },
  ];

  useEffect(() => {
    activeRef.current?.scrollIntoView({ inline: "center", block: "nearest" });
  }, [pathname]);

  return (
    <nav aria-label="Menu admin sesi" className="flex gap-1 overflow-x-auto border-b border-line px-3 md:px-7">
      {tabs.map((tab) => {
        const active = pathname === tab.href.split("#")[0] && !tab.href.includes("#");
        return (
          <Link
            key={tab.href}
            ref={active ? activeRef : undefined}
            href={tab.href}
            aria-current={active ? "page" : undefined}
            className={`flex h-[50px] shrink-0 items-center whitespace-nowrap border-b-[3px] px-3.5 text-[15px] ${
              active ? "border-primary font-extrabold text-fg" : "border-transparent font-semibold text-muted"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function ClearDialog() {
  const { clearConfirm, setClearConfirm, actions } = useAdmin();
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    const ack = await actions.control("clear");
    setBusy(false);
    setClearConfirm(false);
    if (ack.ok) toast.success("Photowall di-clear.");
    else toast.error("Clear gagal. Periksa koneksi lalu coba lagi.");
  };

  return (
    <ConfirmDialog
      open={clearConfirm}
      title="Clear photowall sekarang?"
      description="Semua kata hilang dari layar. Data tetap tersimpan dan bisa diunduh."
      confirmLabel="Ya, clear"
      tone="danger"
      busy={busy}
      onConfirm={confirm}
      onCancel={() => setClearConfirm(false)}
    />
  );
}

function MobileNav() {
  const { ref, connected, state, actions, setClearConfirm } = useAdmin();
  const pathname = usePathname();
  const base = `/s/${ref}/admin`;
  const temaActive = pathname === `${base}/tema`;
  const blocklistActive = pathname === `${base}/blocklist`;
  const item = "flex h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-xs font-bold disabled:opacity-50";

  return (
    <nav
      aria-label="Aksi cepat"
      className="fixed inset-x-0 bottom-0 grid grid-cols-5 gap-1 border-t border-line bg-surface px-2.5 pb-3 pt-2 md:hidden"
    >
      <button type="button" disabled={!connected} onClick={() => actions.control(state.paused ? "resume" : "pause")} className={item}>
        {state.paused ? <PlayIcon size={20} strokeWidth={2.2} /> : <PauseIcon size={20} strokeWidth={2.2} />}
        {state.paused ? "Lanjutkan" : "Pause"}
      </button>
      <button type="button" disabled={!connected} onClick={() => actions.control(state.frozen ? "unfreeze" : "freeze")} className={item}>
        <FreezeIcon size={20} />
        {state.frozen ? "Cairkan" : "Freeze"}
      </button>
      <Link
        href={temaActive ? base : `${base}/tema`}
        aria-current={temaActive ? "page" : undefined}
        className={`${item} ${temaActive ? "bg-surface2" : ""}`}
      >
        <SlidersIcon size={20} />
        Tema
      </Link>
      <Link
        href={blocklistActive ? base : `${base}/blocklist`}
        aria-current={blocklistActive ? "page" : undefined}
        className={`${item} ${blocklistActive ? "bg-surface2" : ""}`}
      >
        <BanIcon size={20} />
        Blocklist
      </Link>
      <button type="button" disabled={!connected} onClick={() => setClearConfirm(true)} className={`${item} text-danger`}>
        <TrashIcon size={20} />
        Clear
      </button>
    </nav>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { connected, ready } = useAdmin();

  return (
    <div className="flex min-h-view flex-col bg-bg text-fg">
      <Header />
      <Tabs />
      {!connected && ready ? (
        <div
          role="status"
          className="flex items-center gap-2.5 bg-[#FFF1DC] px-[18px] py-3 text-sm font-bold text-[#7A3E00] md:px-8"
        >
          <WifiOffIcon size={18} />
          Koneksi terputus. Menyambung ulang…
        </div>
      ) : null}
      <ClearDialog />
      <div className="flex flex-1 flex-col pb-24 md:pb-0">{children}</div>
      <MobileNav />
    </div>
  );
}
