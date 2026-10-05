"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CODE_LENGTH, normalizeCode } from "@/lib/code";
import { AlertCircleIcon, ArrowRightIcon, ChevronLeftIcon, PhoneIcon, ScanIcon, SpinnerIcon } from "./icons";

function lookupError(status: number): string {
  if (status === 404) return "Kode tidak ditemukan. Cek lagi di layar Siap tayang.";
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  return "Tidak bisa memeriksa kode. Coba lagi.";
}

export function JoinForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (loading || code.length !== CODE_LENGTH) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${code}`);
      if (!response.ok) {
        setError(lookupError(response.status));
        setLoading(false);
        return;
      }
      router.push(`/s/${code}/input`);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 flex-col items-center px-[22px] pb-8 pt-7 md:justify-center md:px-6 md:pb-16 md:pt-8">
      <div className="flex w-full max-w-[1040px] flex-wrap content-start items-center justify-center gap-x-16 gap-y-7 md:content-center md:gap-y-12">
        <div className="flex w-full min-w-0 max-w-[520px] flex-[1_1_360px] flex-col gap-7 md:gap-5">
          <Link href="/" className="flex items-center gap-1.5 self-start text-sm font-semibold text-muted md:text-[15px]">
            <ChevronLeftIcon size={16} />
            Kembali
          </Link>
          <div className="flex flex-col gap-2 md:gap-3">
            <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.02em] md:text-5xl md:leading-[1.05]">
              Join Session
            </h1>
            <p className="m-0 text-[15px] leading-[1.55] text-muted md:text-lg">
              Device ini akan jadi tempat input kata. Kode ada di layar Siap tayang.
            </p>
          </div>
          <ul className="m-0 hidden list-none flex-col gap-3 p-0 text-[15px] leading-normal md:flex">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface2">
                <PhoneIcon size={16} />
              </span>
              <span>Bisa pakai HP, tablet, atau laptop.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface2">
                <ArrowRightIcon size={16} />
              </span>
              <span>Setelah join, layar ini langsung jadi halaman input kata.</span>
            </li>
          </ul>
        </div>

        <div className="flex w-full min-w-0 max-w-[520px] flex-[1_1_420px] flex-col gap-5 md:gap-[22px] md:rounded-3xl md:border md:border-line md:bg-surface md:p-8">
          <form onSubmit={submit} className="m-0 flex flex-col gap-3.5">
            <label htmlFor="kode-join" className="text-sm font-bold md:text-[15px]">
              Kode sesi
            </label>
            <input
              id="kode-join"
              type="text"
              value={code}
              onChange={(event) => {
                setCode(normalizeCode(event.target.value));
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              aria-describedby="kode-bantu"
              aria-invalid={error ? true : undefined}
              className="box-border h-[76px] w-full rounded-2xl border-2 border-ring bg-field px-3 text-center font-mono text-[34px] font-bold uppercase tracking-[0.32em] text-fg focus:outline-none md:h-[84px] md:text-[40px]"
            />
            <span id="kode-bantu" className="text-[13px] text-muted md:text-sm">
              6 karakter, tanpa O, 0, I, atau 1.
            </span>
            {error ? (
              <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
                <AlertCircleIcon size={18} />
                {error}
              </span>
            ) : null}
            <button
              type="submit"
              disabled={code.length !== CODE_LENGTH || loading}
              className="mt-1.5 flex h-[60px] items-center justify-center gap-2.5 rounded-2xl bg-primary text-[17px] font-extrabold text-on-primary disabled:opacity-50"
            >
              <span>Gabung</span>
              {loading ? <SpinnerIcon size={20} /> : <ArrowRightIcon size={20} strokeWidth={2.2} />}
            </button>
          </form>
          <div className="hidden items-start gap-3 rounded-[14px] bg-surface2 px-4 py-3.5 text-sm leading-normal md:flex">
            <ScanIcon size={18} className="mt-px shrink-0" />
            <span>Punya kamera? Scan QR di layar Siap tayang untuk langsung masuk.</span>
          </div>
        </div>
      </div>
      <div className="mt-auto flex w-full max-w-[520px] items-start gap-3 rounded-[14px] bg-surface2 px-4 py-3.5 text-[13px] leading-normal md:hidden">
        <ScanIcon size={18} className="mt-px shrink-0" />
        <span>Punya kamera? Scan QR di layar Siap tayang untuk langsung masuk.</span>
      </div>
    </main>
  );
}
