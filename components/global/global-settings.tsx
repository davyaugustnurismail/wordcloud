"use client";

import { useRef, useState, type FormEvent } from "react";
import { ACCEPTED_IMAGE_TYPES, checkImageFile, IMAGE_FILE_HELP, uploadErrorMessage } from "@/lib/image-file";
import type { LibraryImage } from "@/lib/library";
import {
  assetUrl,
  inputThemes,
  moderationModes,
  photowallThemes,
  type InputTheme,
  type ModerationMode,
  type PhotowallTheme,
  type SessionDefaults,
} from "@/lib/settings";
import { AlertCircleIcon, CheckIcon, SpinnerIcon, UploadIcon } from "../icons";

const themeLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
const selectClass =
  "box-border h-[46px] rounded-[10px] border border-line bg-field px-3 text-[15px] font-semibold text-fg focus:border-ring focus:outline-none";
const inputClass = selectClass;
const sectionClass = "flex scroll-mt-6 flex-col gap-[18px] rounded-[18px] border border-line bg-surface p-5 md:p-6";

function Status({ ok, children }: { ok: boolean; children: string }) {
  return (
    <span role={ok ? "status" : "alert"} className={`flex items-center gap-2 text-sm font-bold ${ok ? "text-live" : "text-danger"}`}>
      {ok ? <CheckIcon size={16} strokeWidth={2.6} /> : <AlertCircleIcon size={16} />}
      {children}
    </span>
  );
}

function DefaultsSection({ initial }: { initial: SessionDefaults }) {
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const numberField = (key: "k" | "maxChars" | "safePct", label: string, id: string, min: number, max: number) => (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={values[key]}
        onChange={(event) => setValues({ ...values, [key]: Number(event.target.value) })}
        className={inputClass}
      />
    </div>
  );

  const save = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/defaults", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      setMessage(
        response.ok
          ? { ok: true, text: "Default tersimpan." }
          : { ok: false, text: "Nilai tidak valid. Periksa rentang tiap kolom." },
      );
    } catch {
      setMessage({ ok: false, text: "Tidak bisa menghubungi server. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="default" className={sectionClass}>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-xl font-extrabold">Default sesi baru</h2>
        <p className="m-0 text-sm text-muted">Dipakai saat Create Session. Setiap sesi tetap bisa mengubahnya sendiri.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
        <div className="flex flex-col gap-2">
          <label htmlFor="d-pw" className="text-sm font-bold">
            Tema photowall
          </label>
          <select
            id="d-pw"
            value={values.photowallTheme}
            onChange={(event) => setValues({ ...values, photowallTheme: event.target.value as PhotowallTheme })}
            className={selectClass}
          >
            {photowallThemes.map((theme) => (
              <option key={theme} value={theme}>
                {themeLabel(theme)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="d-in" className="text-sm font-bold">
            Tema input
          </label>
          <select
            id="d-in"
            value={values.inputTheme}
            onChange={(event) => setValues({ ...values, inputTheme: event.target.value as InputTheme })}
            className={selectClass}
          >
            {inputThemes.map((theme) => (
              <option key={theme} value={theme}>
                {themeLabel(theme)}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <label htmlFor="d-mod" className="text-sm font-bold">
            Moderasi
          </label>
          <select
            id="d-mod"
            value={values.moderationMode}
            onChange={(event) => setValues({ ...values, moderationMode: event.target.value as ModerationMode })}
            className={selectClass}
          >
            {moderationModes.map((mode) => (
              <option key={mode} value={mode}>
                {themeLabel(mode)}
              </option>
            ))}
          </select>
        </div>
        {numberField("k", "Kecepatan mengecil (k)", "d-k", 3, 24)}
        {numberField("maxChars", "Maks karakter", "d-max", 3, 40)}
        {numberField("safePct", "Area aman (%)", "d-safe", 0, 12)}
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          disabled={busy}
          onClick={save}
          className="h-[46px] rounded-xl border-0 bg-primary px-[18px] text-[15px] font-extrabold text-on-primary disabled:opacity-60"
        >
          Simpan default
        </button>
        {message ? <Status ok={message.ok}>{message.text}</Status> : null}
      </div>
    </section>
  );
}

function LibrarySection({ initial }: { initial: LibraryImage[] }) {
  const [images, setImages] = useState(initial);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    const problem = checkImageFile(file);
    setError(problem);
    if (problem) return;

    setUploading(true);
    try {
      const body = new FormData();
      body.set("file", file);
      const response = await fetch("/api/admin/library", { method: "POST", body });
      if (!response.ok) {
        setError(uploadErrorMessage(response.status));
        return;
      }
      const image = (await response.json()) as LibraryImage;
      setImages((current) => [...current, image]);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section id="gambar" className={sectionClass}>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-xl font-extrabold">Pustaka gambar latar</h2>
        <p className="m-0 text-sm text-muted">Untuk tema Foto di photowall dan input. Dikompres ke lebar 1920 px.</p>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-3.5">
        {images.map((image) => (
          <figure key={image.path} className="m-0 flex flex-col gap-2">
            <img
              src={assetUrl(image.previewId)}
              alt={`Latar ${image.name}`}
              loading="lazy"
              className="aspect-video w-full rounded-xl border border-line object-cover"
            />
            <figcaption className="flex justify-between gap-2 text-[13px]">
              <b className="truncate">{image.name}</b>
              <span className="shrink-0 text-muted">{image.usedBy > 0 ? `dipakai ${image.usedBy} sesi` : "belum dipakai"}</span>
            </figcaption>
          </figure>
        ))}
        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInput.current?.click()}
          className="flex aspect-video flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line-strong bg-transparent text-sm font-bold text-muted disabled:opacity-60"
        >
          {uploading ? <SpinnerIcon size={24} /> : <UploadIcon size={24} />}
          Upload gambar
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
            if (file) void upload(file);
          }}
        />
      </div>
      {error ? <Status ok={false}>{error}</Status> : <span className="text-xs text-muted">{IMAGE_FILE_HELP}</span>}
    </section>
  );
}

function PasswordSection() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    if (password.length < 8) {
      setMessage({ ok: false, text: "Password minimal 8 karakter." });
      return;
    }
    if (password !== confirm) {
      setMessage({ ok: false, text: "Password dan pengulangannya tidak sama." });
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password, confirm }),
      });
      if (response.ok) {
        setPassword("");
        setConfirm("");
        setMessage({ ok: true, text: "Password diganti. Sesi yang sudah berjalan tidak terpengaruh." });
      } else {
        setMessage({ ok: false, text: "Password gagal diganti. Coba lagi." });
      }
    } catch {
      setMessage({ ok: false, text: "Tidak bisa menghubungi server. Coba lagi." });
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="password" className={sectionClass}>
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-xl font-extrabold">Password pembuat sesi</h2>
        <p className="m-0 text-sm text-muted">
          Siapa pun yang tahu password ini bisa membuat sesi. Sesi yang sudah berjalan tidak terpengaruh.
        </p>
      </div>
      <form onSubmit={submit} className="m-0 flex flex-col gap-[18px]">
        <div className="flex flex-wrap gap-4">
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
            <label htmlFor="pw-baru" className="text-sm font-bold">
              Password baru
            </label>
            <input
              id="pw-baru"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-2">
            <label htmlFor="pw-ulang" className="text-sm font-bold">
              Ulangi password
            </label>
            <input
              id="pw-ulang"
              type="password"
              value={confirm}
              onChange={(event) => setConfirm(event.target.value)}
              autoComplete="new-password"
              className={inputClass}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={busy}
            className="h-[46px] rounded-xl border border-line bg-transparent px-[18px] text-[15px] font-extrabold text-fg disabled:opacity-60"
          >
            Ganti password
          </button>
          {message ? <Status ok={message.ok}>{message.text}</Status> : null}
        </div>
      </form>
    </section>
  );
}

export function GlobalSettings({ defaults, library }: { defaults: SessionDefaults; library: LibraryImage[] }) {
  return (
    <main className="flex min-w-0 flex-col gap-5 px-4 py-6 md:px-8 md:pb-12">
      <DefaultsSection initial={defaults} />
      <LibrarySection initial={library} />
      <PasswordSection />
    </main>
  );
}
