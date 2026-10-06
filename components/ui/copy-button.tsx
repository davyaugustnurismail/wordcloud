"use client";

import { useEffect, useState, type ReactNode } from "react";
import { copyText } from "@/lib/clipboard";
import { CheckIcon, CopyIcon } from "../icons";
import { useToast } from "./toast";

type Props = {
  value: string;
  label: string;
  successMessage?: string;
  className?: string;
  children?: ReactNode;
};

const RESET_MS = 1500;

export function CopyButton({ value, label, successMessage = "Tersalin", className, children }: Props) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), RESET_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    const ok = await copyText(value);
    setCopied(ok);
    if (ok) toast.success(successMessage);
    else toast.error("Tidak bisa menyalin. Salin manual dari kolomnya.");
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label={label}
      className={
        className ??
        "flex h-11 items-center justify-center gap-2 rounded-xl border border-line bg-surface px-3.5 text-sm font-bold text-fg"
      }
    >
      {copied ? <CheckIcon size={18} strokeWidth={2.4} /> : <CopyIcon size={18} />}
      {children}
    </button>
  );
}
