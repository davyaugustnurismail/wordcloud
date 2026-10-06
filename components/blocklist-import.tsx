"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MAX_IMPORT_TERMS, parseTerms } from "@/lib/blocklist-import";
import { IMPORT_ACCEPT, ImportFileError, readImportFile } from "@/lib/blocklist-file";
import { AlertCircleIcon, FileIcon, PlusIcon, SpinnerIcon, UploadIcon } from "./icons";
import { useToast } from "./ui/toast";
import { btnOutline, btnPrimary, fieldClass } from "./ui/styles";

type Props = {
  endpoint: string;
  scope?: string;
  target: string;
  disabled?: boolean;
  onImported: (terms: string[]) => void;
};

type Mode = "paste" | "file";
type ImportResponse = { added: number; skipped: number; invalid: number; terms: string[] };

const PREVIEW_LIMIT = 24;

function importError(status: number): string {
  if (status === 401) return "Sesi admin berakhir. Masuk lagi.";
  if (status === 400) return "Tidak ada kata valid untuk ditambahkan.";
  return "Gagal menambahkan. Coba lagi.";
}

function modeClass(active: boolean) {
  return `h-10 flex-1 rounded-[10px] border-0 px-4 text-sm font-extrabold ${
    active ? "bg-primary text-on-primary" : "bg-transparent text-fg"
  }`;
}

export function BlocklistImport({ endpoint, scope, target, disabled = false, onImported }: Props) {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("paste");
  const [pasted, setPasted] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [fileText, setFileText] = useState("");
  const [skipHeader, setSkipHeader] = useState(true);
  const [reading, setReading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!file) {
      setFileText("");
      return;
    }
    let active = true;
    setReading(true);
    setError(null);
    readImportFile(file, skipHeader)
      .then((text) => {
        if (active) setFileText(text);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setFileText("");
        setError(err instanceof ImportFileError ? err.message : "File tidak bisa dibaca.");
      })
      .finally(() => {
        if (active) setReading(false);
      });
    return () => {
      active = false;
    };
  }, [file, skipHeader]);

  const source = mode === "paste" ? pasted : fileText;
  const parsed = useMemo(() => parseTerms(source), [source]);
  const count = parsed.terms.length;

  const reset = () => {
    setPasted("");
    setFile(null);
    setFileText("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const submit = async () => {
    if (busy || count === 0) return;
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ terms: parsed.terms, ...(scope ? { scope } : {}) }),
      });
      if (!response.ok) {
        setError(importError(response.status));
        return;
      }
      const result = (await response.json()) as ImportResponse;
      onImported(result.terms);
      toast.success(
        result.skipped > 0
          ? `${result.added} kata ditambahkan, ${result.skipped} sudah ada di daftar.`
          : `${result.added} kata ditambahkan ke blocklist.`,
      );
      reset();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className={`${btnOutline} self-start`}>
        <UploadIcon size={18} strokeWidth={2.2} />
        Import banyak kata
      </button>
    );
  }

  return (
    <section aria-label="Import blocklist" className="flex flex-col gap-4 rounded-[14px] border border-line bg-surface2 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <h2 className="m-0 text-[17px] font-extrabold">Import banyak kata</h2>
          <p className="m-0 text-sm leading-normal text-muted">
            Tempel satu kata per baris, atau unggah file Excel (.xlsx), CSV, atau teks. Kata dipisah baris, koma, atau
            titik koma. Maksimal {MAX_IMPORT_TERMS} kata sekali impor.
          </p>
          <p className="m-0 text-sm font-bold">
            Ditambahkan ke: <span className="underline underline-offset-[3px]">{target}</span>
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            reset();
            setOpen(false);
          }}
          className="h-10 shrink-0 rounded-[10px] border border-line bg-transparent px-3.5 text-sm font-bold text-fg"
        >
          Tutup
        </button>
      </div>

      <div role="group" aria-label="Sumber kata" className="flex rounded-xl bg-surface p-1">
        <button type="button" aria-pressed={mode === "paste"} onClick={() => setMode("paste")} className={modeClass(mode === "paste")}>
          Tempel daftar
        </button>
        <button type="button" aria-pressed={mode === "file"} onClick={() => setMode("file")} className={modeClass(mode === "file")}>
          Unggah file
        </button>
      </div>

      {mode === "paste" ? (
        <div className="flex flex-col gap-2">
          <label htmlFor="import-teks" className="text-sm font-bold">
            Daftar kata
          </label>
          <textarea
            id="import-teks"
            value={pasted}
            onChange={(event) => {
              setPasted(event.target.value);
              setError(null);
            }}
            rows={7}
            placeholder={"kata1\nkata2\nkata3"}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className={`${fieldClass} h-auto resize-y py-3 font-mono text-[15px] leading-normal`}
          />
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <input
            ref={fileInputRef}
            id="import-file"
            type="file"
            accept={IMPORT_ACCEPT}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
            className="sr-only"
          />
          <label
            htmlFor="import-file"
            className="flex min-h-[88px] cursor-pointer items-center gap-3 rounded-xl border-2 border-dashed border-line-strong bg-surface px-4 py-3 text-sm font-bold focus-within:border-ring"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-surface2">
              <FileIcon size={22} />
            </span>
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate">{file ? file.name : "Pilih file .xlsx, .csv, atau .txt"}</span>
              <span className="text-[13px] font-normal text-muted">Maksimal 2 MB. Excel: sheet pertama yang dibaca.</span>
            </span>
          </label>
          <label className="flex items-center gap-2.5 text-sm font-semibold">
            <input
              type="checkbox"
              checked={skipHeader}
              onChange={(event) => setSkipHeader(event.target.checked)}
              className="h-5 w-5 accent-primary"
            />
            Baris pertama adalah judul kolom (jangan ikut diimpor)
          </label>
        </div>
      )}

      {reading ? (
        <span className="flex items-center gap-2 text-sm font-semibold text-muted">
          <SpinnerIcon size={16} />
          Membaca file…
        </span>
      ) : null}

      {source.trim() && !reading ? (
        <div className="flex flex-col gap-3 rounded-xl bg-surface p-4" aria-live="polite">
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm font-bold">
            <span className={count > 0 ? "text-live" : "text-muted"}>{count} kata siap ditambahkan</span>
            {parsed.duplicates > 0 ? <span className="text-muted">{parsed.duplicates} duplikat di daftar</span> : null}
            {parsed.invalidCount > 0 ? <span className="text-danger">{parsed.invalidCount} ditolak</span> : null}
          </div>
          {count > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {parsed.terms.slice(0, PREVIEW_LIMIT).map((term) => (
                <span key={term} className="rounded-full bg-surface2 px-3 py-1 text-sm font-bold">
                  {term}
                </span>
              ))}
              {count > PREVIEW_LIMIT ? (
                <span className="px-1 py-1 text-sm font-semibold text-muted">+{count - PREVIEW_LIMIT} lagi</span>
              ) : null}
            </div>
          ) : null}
          {parsed.invalidCount > 0 ? (
            <p className="m-0 text-[13px] leading-normal text-muted">
              Ditolak karena mengandung simbol atau lebih dari 40 karakter, contoh:{" "}
              <b className="text-fg">{parsed.invalidSamples.join(", ")}</b>
            </p>
          ) : null}
          {parsed.truncated ? (
            <p className="m-0 text-[13px] leading-normal text-warn">
              Hanya {MAX_IMPORT_TERMS} kata pertama yang dipakai. Impor sisanya di putaran berikutnya.
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
          <AlertCircleIcon size={18} />
          {error}
        </span>
      ) : null}

      <div className="flex flex-wrap justify-end gap-2.5">
        <button type="button" disabled={busy || (!pasted && !file)} onClick={reset} className={btnOutline}>
          Bersihkan
        </button>
        <button type="button" disabled={disabled || busy || reading || count === 0} onClick={submit} className={btnPrimary}>
          {busy ? <SpinnerIcon size={18} /> : <PlusIcon size={18} strokeWidth={2.4} />}
          {count > 0 ? `Tambahkan ${count} kata` : "Tambahkan"}
        </button>
      </div>
    </section>
  );
}
