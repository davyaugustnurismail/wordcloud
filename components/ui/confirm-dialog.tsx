"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { SpinnerIcon } from "../icons";

type Props = {
  open: boolean;
  title: string;
  description: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  tone?: "danger" | "default";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel = "Batal",
  tone = "default",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const confirmClass =
    tone === "danger"
      ? "bg-danger-solid text-white"
      : "bg-primary text-on-primary";

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onCancel();
      }}
      onClick={(event) => {
        if (event.target === dialogRef.current && !busy) onCancel();
      }}
      className="m-auto w-[min(92vw,460px)] rounded-[20px] border border-line bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex flex-col gap-5 p-6">
        <div className="flex flex-col gap-2">
          <h2 id={titleId} className="m-0 text-xl font-extrabold">
            {title}
          </h2>
          <div id={descriptionId} className="text-[15px] leading-normal text-muted">
            {description}
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2.5">
          <button
            type="button"
            autoFocus
            disabled={busy}
            onClick={onCancel}
            className="h-11 rounded-xl border border-line bg-transparent px-4 text-sm font-bold text-fg disabled:opacity-60"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className={`flex h-11 items-center gap-2 rounded-xl border-0 px-4 text-sm font-extrabold disabled:opacity-60 ${confirmClass}`}
          >
            {busy ? <SpinnerIcon size={16} /> : null}
            {confirmLabel}
          </button>
        </div>
      </div>
    </dialog>
  );
}
