"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Mode = "dark" | "light";

const STORAGE_KEY = "wc-theme";

export function ThemeToggle({ iconOnly = false }: { iconOnly?: boolean }) {
  const [mode, setMode] = useState<Mode>("dark");

  useEffect(() => {
    setMode(document.documentElement.dataset.theme === "light" ? "light" : "dark");
  }, []);

  const next: Mode = mode === "dark" ? "light" : "dark";
  const nextLabel = next === "light" ? "terang" : "gelap";

  const toggle = () => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {}
    setMode(next);
  };

  const sizing = iconOnly ? "h-10 w-10 md:h-10" : "h-11 w-11 sm:h-10 sm:w-auto sm:px-3.5";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Ganti ke mode ${nextLabel}`}
      className={`flex items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold text-fg ${sizing}`}
    >
      {mode === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      {iconOnly ? null : <span className="hidden sm:inline">Mode {nextLabel}</span>}
    </button>
  );
}
