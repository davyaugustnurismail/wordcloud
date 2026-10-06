"use client";

import { useEffect, useRef } from "react";
import { isDarkColor } from "@/lib/color";
import type { ResolvedInputTheme } from "@/lib/input-themes";
import { BanIcon } from "./icons";

type Props = {
  word: string | null;
  theme: ResolvedInputTheme;
  onClose: () => void;
};

export function ForbiddenWordDialog({ word, theme, onClose }: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const open = word !== null;
  const dark = isDarkColor(theme.base);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const panel = dark ? { background: "#17171A", color: "#FFFFFF", chip: "#26262B", muted: "#C9C9CF" } : { background: "#FFFFFF", color: "#141416", chip: "#F1F0EA", muted: "#55555D" };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="kata-terlarang-judul"
      aria-describedby="kata-terlarang-isi"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      className="m-auto w-[min(92vw,540px)] rounded-[28px] border-0 p-0 shadow-2xl backdrop:bg-black/75"
      style={{ background: panel.background, color: panel.color }}
    >
      <div className="flex flex-col items-center gap-5 px-6 py-8 text-center md:gap-6 md:px-10 md:py-10">
        <span className="flex h-16 w-16 items-center justify-center rounded-full text-white md:h-20 md:w-20" style={{ background: "#D62F2F" }}>
          <BanIcon size={40} strokeWidth={2.4} />
        </span>
        <h2 id="kata-terlarang-judul" className="m-0 font-display text-[32px] font-extrabold leading-[1.05] md:text-[44px]">
          Kata ini tidak boleh dipakai
        </h2>
        <div id="kata-terlarang-isi" className="flex w-full flex-col items-center gap-3">
          <span
            className="max-w-full break-all rounded-2xl px-5 py-2 font-display text-[34px] font-extrabold leading-[1.1] md:text-[44px]"
            style={{ background: panel.chip }}
          >
            “{word}”
          </span>
          <p className="m-0 text-base font-semibold leading-normal md:text-lg" style={{ color: panel.muted }}>
            Kata itu termasuk kata terlarang di sesi ini, jadi tidak dikirim ke layar. Silakan ketik kata lain.
          </p>
        </div>
        <button
          type="button"
          autoFocus
          onClick={onClose}
          className={`flex h-[64px] w-full items-center justify-center border-0 font-display text-[28px] font-extrabold md:h-[76px] md:text-[34px] ${theme.box.buttonRadiusClass}`}
          style={{ background: theme.button.background, color: theme.button.color, boxShadow: theme.buttonShadow ?? undefined }}
        >
          Ketik kata lain
        </button>
      </div>
    </dialog>
  );
}
