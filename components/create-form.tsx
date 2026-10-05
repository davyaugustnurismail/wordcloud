"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { DEFAULT_PROMPT, type InputTheme, type PhotowallTheme } from "@/lib/settings";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon, ChevronLeftIcon, LockIcon, SpinnerIcon } from "./icons";

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

const photowallOptions: PhotowallOption[] = [
  { id: "hitam", label: "Hitam", background: "#000000", words: ["#FFE14D", "#3DE0FF", "#FF4FAE"] },
  { id: "putih", label: "Putih", background: "#FFFFFF", words: ["#0B2E8A", "#B0125B", "#0A6B4C"] },
];

const inputOptions: InputOption[] = [
  { id: "reggae", label: "Reggae", background: "#0C0C0C", field: "#FFFFFF", fieldBorder: "#0C0C0C", bands: true },
  { id: "hitam", label: "Hitam", background: "#000000", field: "#141416", fieldBorder: "#FFE14D", bands: false },
  { id: "putih", label: "Putih", background: "#FFFFFF", field: "#F6F5F1", fieldBorder: "#141416", bands: false },
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
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 400) return "Periksa kembali isian form.";
  return "Sesi gagal dibuat. Coba lagi.";
}

export function CreateForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [photowallTheme, setPhotowallTheme] = useState<PhotowallTheme>("hitam");
  const [inputTheme, setInputTheme] = useState<InputTheme>("reggae");
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [maxChars, setMaxChars] = useState("20");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("name", name);
    body.set("password", password);
    body.set("photowallTheme", photowallTheme);
    body.set("inputTheme", inputTheme);
    body.set("prompt", prompt);
    body.set("maxChars", maxChars);

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
