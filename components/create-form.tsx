"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { checkImageFile } from "@/lib/image-file";
import {
  assetUrl,
  DEFAULT_PROMPT,
  type InputTheme,
  type ModerationMode,
  type PhotowallTheme,
} from "@/lib/settings";
import { BackgroundPicker } from "./background-picker";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon, ChevronLeftIcon, LockIcon, SpinnerIcon } from "./icons";

type Library = { photowall: string[]; input: string[] };

type Background = { type: "library"; id: string } | { type: "file"; file: File; url: string } | null;

type PhotowallOption = {
  id: PhotowallTheme;
  label: string;
  background: string;
  words: [string, string, string];
};

type InputOption = {
  id: InputTheme;
  label: string;
  background: string;
  field: string;
  fieldBorder: string;
  bands: boolean;
};

const moderationOptions: { id: ModerationMode; label: string; description: string }[] = [
  {
    id: "langsung",
    label: "Langsung (default)",
    description: "Kata tampil di photowall begitu dikirim. Admin tetap bisa menyembunyikan.",
  },
  {
    id: "approve",
    label: "Approve",
    description: "Kata menunggu di admin sampai disetujui, baru naik ke tengah.",
  },
];

const photowallOptions: PhotowallOption[] = [
  { id: "hitam", label: "Hitam", background: "#000000", words: ["#FFE14D", "#3DE0FF", "#FF4FAE"] },
  { id: "putih", label: "Putih", background: "#FFFFFF", words: ["#0B2E8A", "#B0125B", "#0A6B4C"] },
  { id: "foto", label: "Foto", background: "#000000", words: ["#FFFFFF", "#FFE14D", "#8BE9FF"] },
];

const inputOptions: InputOption[] = [
  { id: "reggae", label: "Reggae", background: "#0C0C0C", field: "#FFFFFF", fieldBorder: "#0C0C0C", bands: true },
  { id: "hitam", label: "Hitam", background: "#000000", field: "#141416", fieldBorder: "#FFE14D", bands: false },
  { id: "putih", label: "Putih", background: "#FFFFFF", field: "#F6F5F1", fieldBorder: "#141416", bands: false },
  { id: "foto", label: "Foto", background: "#000000", field: "#FFFFFF", fieldBorder: "#FFFFFF", bands: false },
];

const fieldClass =
  "box-border h-[52px] w-full min-w-0 rounded-xl border border-line bg-field px-4 text-[17px] font-semibold text-fg focus:border-ring focus:outline-none";
const sectionClass = "flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-7";

function optionClass(selected: boolean) {
  return `flex min-w-0 flex-col gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
    selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
  }`;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-lg font-extrabold">{title}</h2>
      <p className="m-0 text-sm text-muted">{description}</p>
    </div>
  );
}

function OptionFooter({ label, selected }: { label: string; selected: boolean }) {
  return (
    <span className="flex items-center justify-between px-1 pb-0.5">
      <span className="text-[15px] font-extrabold">{label}</span>
      {selected ? <CheckIcon size={18} strokeWidth={2.6} /> : null}
    </span>
  );
}

function errorMessage(status: number): string {
  if (status === 401) return "Password pembuat sesi salah.";
  if (status === 413) return "Gambar terlalu besar. Maksimal 10 MB.";
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 400) return "Periksa kembali isian form dan gambar latar.";
  return "Sesi gagal dibuat. Coba lagi.";
}

function backgroundUrl(background: Background): string | null {
  if (!background) return null;
  return background.type === "library" ? assetUrl(background.id) : background.url;
}

export function CreateForm({ library }: { library: Library }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [moderation, setModeration] = useState<ModerationMode>("langsung");
  const [photowallTheme, setPhotowallTheme] = useState<PhotowallTheme>("hitam");
  const [inputTheme, setInputTheme] = useState<InputTheme>("reggae");
  const [photowallBg, setPhotowallBg] = useState<Background>(
    library.photowall[0] ? { type: "library", id: library.photowall[0] } : null,
  );
  const [inputBg, setInputBg] = useState<Background>(
    library.input[0] ? { type: "library", id: library.input[0] } : null,
  );
  const [photowallBgError, setPhotowallBgError] = useState<string | null>(null);
  const [inputBgError, setInputBgError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [maxChars, setMaxChars] = useState("20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const pickFile = (
    file: File,
    setBackground: (background: Background) => void,
    setBackgroundError: (message: string | null) => void,
  ) => {
    const problem = checkImageFile(file);
    setBackgroundError(problem);
    if (problem) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setBackground({ type: "file", file, url });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if ((photowallTheme === "foto" && !photowallBg) || (inputTheme === "foto" && !inputBg)) {
      setError("Pilih atau upload gambar latar untuk tema Foto.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("name", name);
    body.set("password", password);
    body.set("moderationMode", moderation);
    body.set("photowallTheme", photowallTheme);
    body.set("inputTheme", inputTheme);
    body.set("prompt", prompt);
    body.set("maxChars", maxChars);
    if (photowallBg?.type === "file") body.set("photowallImage", photowallBg.file);
    else if (photowallBg) body.set("photowallBgId", photowallBg.id);
    if (inputBg?.type === "file") body.set("inputImage", inputBg.file);
    else if (inputBg) body.set("inputBgId", inputBg.id);

    try {
      const response = await fetch("/api/sessions", { method: "POST", body });
      if (!response.ok) {
        setError(errorMessage(response.status));
        setSubmitting(false);
        return;
      }
      const { code } = (await response.json()) as { code: string };
      router.push(`/s/${code}/ready`);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      setSubmitting(false);
    }
  };

  const photowallPreviewUrl = backgroundUrl(photowallBg);
  const inputPreviewUrl = backgroundUrl(inputBg);

  return (
    <main className="flex flex-1 justify-center px-6 pb-16 pt-10">
      <form onSubmit={submit} className="m-0 flex w-full max-w-[760px] flex-col gap-7">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-1.5 self-start text-sm font-semibold text-muted">
            <ChevronLeftIcon size={16} />
            Kembali
          </Link>
          <h1 className="m-0 text-4xl font-extrabold tracking-[-0.02em]">Buat sesi baru</h1>
          <p className="m-0 text-base leading-[1.55] text-muted">
            Layar ini akan jadi photowall. Semua pengaturan bisa diubah lagi dari admin sesi.
          </p>
        </div>

        <section className={`${sectionClass} gap-5`}>
          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
              <label htmlFor="nama-sesi" className="text-sm font-bold">
                Nama sesi
              </label>
              <input
                id="nama-sesi"
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama sesi"
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
              <label htmlFor="pw-pembuat" className="text-sm font-bold">
                Password pembuat sesi
              </label>
              <input
                id="pw-pembuat"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="pw-bantu"
                autoComplete="off"
                className={fieldClass}
              />
              <span id="pw-bantu" className="text-[13px] text-muted">
                Diatur oleh admin global.
              </span>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeading title="Mode moderasi" description="Bisa diganti kapan saja di tengah acara." />
          <div className="flex flex-wrap gap-3">
            {moderationOptions.map((option) => {
              const selected = option.id === moderation;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setModeration(option.id)}
                  className={`flex min-w-0 flex-[1_1_260px] items-start gap-3.5 rounded-[14px] border-2 p-[18px] text-left ${
                    selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
                  }`}
                >
                  <span
                    className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-primary" : "border-muted"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-primary" : "bg-transparent"}`} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-extrabold">{option.label}</span>
                    <span className="text-sm leading-[1.45] text-muted">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeading
            title="Tema photowall"
            description="Hitam paling cocok untuk infocus: area hitam tidak memancarkan cahaya, jadi kata terlihat melayang."
          />
          <div className="flex flex-wrap gap-3">
            {photowallOptions.map((option) => {
              const selected = option.id === photowallTheme;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPhotowallTheme(option.id)}
                  className={`${optionClass(selected)} flex-[1_1_180px]`}
                >
                  <span
                    className="relative block h-24 overflow-hidden rounded-[10px] border border-line"
                    style={{ background: option.background }}
                  >
                    {option.id === "foto" && photowallPreviewUrl ? (
                      <img src={photowallPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
                    ) : null}
                    <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 font-display font-extrabold leading-none">
                      <span className="text-[30px]" style={{ color: option.words[0] }}>
                        seru
                      </span>
                      <span className="flex gap-1.5 text-sm">
                        <span style={{ color: option.words[1] }}>irie</span>
                        <span style={{ color: option.words[2] }}>damai</span>
                      </span>
                    </span>
                  </span>
                  <OptionFooter label={option.label} selected={selected} />
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <span className="text-[15px] font-bold">Gambar latar photowall</span>
              <span className="text-[13px] text-muted">Dipakai saat tema Foto. JPG/PNG, dikompres ke lebar 1920 px.</span>
            </div>
            <BackgroundPicker
              ids={library.photowall}
              selectedId={photowallBg?.type === "library" ? photowallBg.id : null}
              localPreview={photowallBg?.type === "file" ? photowallBg.url : null}
              size="lg"
              ariaSubject="photowall"
              uploadLabel="Upload foto latar photowall"
              error={photowallBgError}
              onSelectId={(id) => {
                setPhotowallBgError(null);
                setPhotowallBg({ type: "library", id });
              }}
              onPickFile={(file) => pickFile(file, setPhotowallBg, setPhotowallBgError)}
            />
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeading title="Halaman input" description="Tampilan di device tempat audiens mengetik kata." />
          <div className="flex flex-wrap gap-3">
            {inputOptions.map((option) => {
              const selected = option.id === inputTheme;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setInputTheme(option.id)}
                  className={`${optionClass(selected)} flex-[1_1_140px]`}
                >
                  <span
                    className="relative flex h-[76px] flex-col overflow-hidden rounded-[10px] border border-line"
                    style={{ background: option.background }}
                  >
                    {option.bands ? (
                      <>
                        <span className="grow bg-[#D62F2F]" />
                        <span className="grow bg-[#F5C02E]" />
                        <span className="grow bg-[#17924A]" />
                      </>
                    ) : null}
                    {option.id === "foto" && inputPreviewUrl ? (
                      <img src={inputPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : null}
                    <span
                      className="absolute inset-x-3.5 top-1/2 h-[26px] -translate-y-1/2 rounded-[7px] border-2"
                      style={{ background: option.field, borderColor: option.fieldBorder }}
                    />
                  </span>
                  <OptionFooter label={option.label} selected={selected} />
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2.5">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <span className="text-[15px] font-bold">Gambar latar input</span>
              <span className="text-[13px] text-muted">Dipakai saat tema Foto.</span>
            </div>
            <BackgroundPicker
              ids={library.input}
              selectedId={inputBg?.type === "library" ? inputBg.id : null}
              localPreview={inputBg?.type === "file" ? inputBg.url : null}
              size="lg"
              ariaSubject="input"
              uploadLabel="Upload foto latar input"
              error={inputBgError}
              onSelectId={(id) => {
                setInputBgError(null);
                setInputBg({ type: "library", id });
              }}
              onPickFile={(file) => pickFile(file, setInputBg, setInputBgError)}
            />
          </div>
          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-[999_1_300px] flex-col gap-2">
              <label htmlFor="ajakan" className="text-sm font-bold">
                Kalimat ajakan
              </label>
              <input
                id="ajakan"
                type="text"
                required
                maxLength={80}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-2">
              <label htmlFor="maks" className="text-sm font-bold">
                Maks karakter
              </label>
              <input
                id="maks"
                type="number"
                required
                min={3}
                max={40}
                value={maxChars}
                onChange={(event) => setMaxChars(event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-[14px] bg-surface2 px-[18px] py-4 text-sm leading-normal text-fg">
          <LockIcon size={20} className="mt-px shrink-0" />
          <span>Kode sesi 6 karakter dan PIN admin 6 digit dibuat otomatis, lalu ditampilkan di halaman berikutnya.</span>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[14px] bg-surface2 px-[18px] py-3.5 text-sm font-bold text-danger"
          >
            <AlertCircleIcon size={18} />
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/"
            className="flex h-14 items-center justify-center rounded-[14px] border border-line px-6 text-base font-bold text-fg"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-primary px-7 text-base font-extrabold text-on-primary disabled:opacity-60"
          >
            {submitting ? "Membuat sesi…" : "Buat sesi"}
            {submitting ? <SpinnerIcon size={20} /> : <ArrowRightIcon size={20} strokeWidth={2.2} />}
          </button>
        </div>
      </form>
    </main>
  );
}
