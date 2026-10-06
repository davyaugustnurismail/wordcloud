"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { MoreIcon } from "../icons";

export const menuItemClass =
  "flex h-10 w-full items-center gap-2.5 rounded-lg border-0 bg-transparent px-3 text-left text-sm font-bold text-fg hover:bg-surface2 disabled:opacity-60";

export function ActionMenu({ label, children }: { label: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="flex h-10 w-10 items-center justify-center rounded-[10px] border border-line bg-transparent text-fg"
      >
        <MoreIcon size={18} />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-11 z-20 flex min-w-[210px] flex-col gap-0.5 rounded-xl border border-line bg-surface p-1.5 shadow-lg"
        >
          {children(() => setOpen(false))}
        </div>
      ) : null}
    </div>
  );
}
