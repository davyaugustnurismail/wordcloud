"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import {
  BanIcon,
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
  const { code, name, presence } = useAdmin();
  const status = useStatus();

  return (
    <header className="border-b border-line px-[18px] pb-3 pt-3.5 md:px-8 md:py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2.5">
        <div className="flex min-w-0 items-center gap-2.5 md:gap-3.5">
          <Link href={`/s/${code}/admin`} className="truncate text-lg font-extrabold">
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
  const { code } = useAdmin();
  const pathname = usePathname();
  const base = `/s/${code}/admin`;
  const tabs = [
    { href: base, label: "Live & moderasi" },
    { href: `${base}/tema`, label: "Tema & tampilan" },
    { href: `${base}/blocklist`, label: "Blocklist" },
    { href: `${base}/dashboard`, label: "Dashboard" },
    { href: `${base}/dashboard#unduh`, label: "Hasil & unduh" },
  ];

  return (
    <nav aria-label="Menu admin sesi" className="flex gap-1 overflow-x-auto border-b border-line px-3 md:px-7">
      {tabs.map((tab) => {
        const active = pathname === tab.href.split("#")[0] && !tab.href.includes("#");
        return (
          <Link
            key={tab.href}
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
  if (!clearConfirm) return null;

  const confirm = async () => {
    await actions.control("clear");
    setClearConfirm(false);
  };

  return (
    <div className="px-4 pt-5 md:px-8">
      <div
        role="alertdialog"
        aria-label="Konfirmasi clear"
        className="flex flex-wrap items-center justify-between gap-3.5 rounded-[14px] border border-danger bg-danger/10 px-[18px] py-4"
      >
        <div className="flex flex-col gap-0.5">
          <span className="text-[15px] font-extrabold">Clear photowall sekarang?</span>
          <span className="text-sm text-muted">Semua kata hilang dari layar. Data tetap tersimpan dan bisa diunduh.</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setClearConfirm(false)}
            className="h-11 rounded-xl border border-line bg-surface px-4 text-sm font-bold text-fg"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={confirm}
            className="h-11 rounded-xl border-0 bg-danger-solid px-4 text-sm font-extrabold text-white"
          >
            Ya, clear
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileNav() {
  const { code, connected, state, actions, setClearConfirm } = useAdmin();
  const pathname = usePathname();
  const base = `/s/${code}/admin`;
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
    <div className="flex min-h-dvh flex-col bg-bg text-fg">
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
