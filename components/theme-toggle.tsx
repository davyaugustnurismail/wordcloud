"use client";

import { useEffect, useState } from "react";
import { MoonIcon, SunIcon } from "./icons";

type Mode = "dark" | "light";

const STORAGE_KEY = "wc-theme";

export function ThemeToggle() {
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

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={`Ganti ke mode ${nextLabel}`}
      className="flex h-11 w-11 items-center justify-center gap-2 rounded-full border border-line bg-surface text-sm font-semibold text-fg sm:h-10 sm:w-auto sm:px-3.5"
    >
      {mode === "dark" ? <SunIcon size={18} /> : <MoonIcon size={18} />}
      <span className="hidden sm:inline">Mode {nextLabel}</span>
    </button>
  );
}
