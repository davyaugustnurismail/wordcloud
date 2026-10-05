"use client";

import { useRef } from "react";
import { assetUrl } from "@/lib/settings";
import { ACCEPTED_IMAGE_TYPES } from "@/lib/image-file";
import { AlertCircleIcon, SpinnerIcon, UploadIcon } from "./icons";

type Props = {
  ids: string[];
  selectedId: string | null;
  localPreview?: string | null;
  size: "lg" | "md";
  ariaSubject: string;
  uploadLabel: string;
  uploading?: boolean;
  error?: string | null;
  onSelectId: (id: string) => void;
  onPickFile: (file: File) => void;
};

const sizes = {
  lg: "h-[68px] w-[120px]",
  md: "h-[60px] w-[96px]",
};

export function BackgroundPicker({
  ids,
  selectedId,
  localPreview = null,
  size,
  ariaSubject,
  uploadLabel,
  uploading = false,
  error = null,
  onSelectId,
  onPickFile,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const thumb = `${sizes[size]} shrink-0 overflow-hidden rounded-[10px] border-[3px] bg-black p-0`;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2.5">
        {ids.map((id, index) => {
          const selected = !localPreview && id === selectedId;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={selected}
              aria-label={`Pilih latar ${ariaSubject} ${index + 1}`}
              onClick={() => onSelectId(id)}
              className={`${thumb} ${selected ? "border-primary" : "border-transparent"}`}
            >
              <img src={assetUrl(id)} alt="" loading="lazy" className="block h-full w-full object-cover" />
            </button>
          );
        })}
        {localPreview ? (
          <button
            type="button"
            aria-pressed
            aria-label={`Foto yang dipilih untuk ${ariaSubject}`}
            className={`${thumb} border-primary`}
          >
            <img src={localPreview} alt="" className="block h-full w-full object-cover" />
          </button>
        ) : null}
        <button
          type="button"
          aria-label={uploadLabel}
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className={`${sizes[size]} box-border flex shrink-0 flex-col items-center justify-center gap-1 rounded-[10px] border-2 border-dashed border-line-strong bg-transparent text-xs font-bold text-muted disabled:opacity-60`}
        >
          {uploading ? <SpinnerIcon size={18} /> : <UploadIcon size={18} />}
          Upload foto
        </button>
        <input
          ref={fileInput}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(",")}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            if (file) onPickFile(file);
          }}
        />
      </div>
      {error ? (
        <span role="alert" className="flex items-center gap-1.5 text-[13px] font-bold text-danger">
          <AlertCircleIcon size={16} />
          {error}
        </span>
      ) : null}
    </div>
  );
}
