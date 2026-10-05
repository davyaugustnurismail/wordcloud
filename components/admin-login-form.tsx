"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { CODE_LENGTH, normalizeCode } from "@/lib/code";
import { AlertCircleIcon, ChevronLeftIcon, ClockIcon, LockIcon, SpinnerIcon } from "./icons";

const PIN_LENGTH = 6;

function loginError(status: number): string {
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 401) return "Kode sesi atau PIN salah.";
  return "Tidak bisa masuk. Coba lagi.";
}

export function AdminLoginForm({ initialCode }: { initialCode: string }) {
  const router = useRouter();
  const [code, setCode] = useState(normalizeCode(initialCode));
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ready = code.length === CODE_LENGTH && pin.length === PIN_LENGTH;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${code}/pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        setError(loginError(response.status));
        setLoading(false);
        return;
      }
      router.push(`/s/${code}/admin`);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 justify-center px-[22px] pb-8 pt-7 md:items-center md:px-6 md:pb-16 md:pt-8">
      <div className="flex w-full max-w-[1040px] flex-wrap content-start items-center justify-center gap-x-16 gap-y-6 md:content-center md:gap-y-12">
        <div className="flex w-full min-w-0 max-w-[520px] flex-[1_1_360px] flex-col gap-5">
          <Link href="/" className="flex items-center gap-1.5 self-start text-sm font-semibold text-muted md:text-[15px]">
            <ChevronLeftIcon size={16} />
            Kembali
          </Link>
          <div className="flex flex-col gap-2 md:gap-3">
            <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.02em] md:text-5xl md:leading-[1.05]">
              Masuk admin sesi
            </h1>
            <p className="m-0 text-[15px] leading-[1.55] text-muted md:text-lg">
              Cukup ketik kode sesi dan PIN 6 digit. Tidak perlu kamera.
            </p>
          </div>
          <ul className="m-0 hidden list-none flex-col gap-3 p-0 text-[15px] leading-normal md:flex">
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface2">
                <LockIcon size={16} />
              </span>
              <span>Kode dan PIN ada di layar Siap tayang milik pembuat sesi.</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-surface2">
                <ClockIcon size={16} />
              </span>
              <span>Sesi admin aktif 24 jam di device ini.</span>
            </li>
          </ul>
          <Link href="/admin/login" className="self-start text-[15px] font-bold text-fg underline underline-offset-[3px]">
            Masuk sebagai admin global
          </Link>
        </div>

        <div className="flex w-full min-w-0 max-w-[520px] flex-[1_1_420px] flex-col gap-5 md:rounded-3xl md:border md:border-line md:bg-surface md:p-8">
          <form onSubmit={submit} className="m-0 flex flex-col gap-4 md:gap-[18px]">
            <div className="flex flex-col gap-2">
              <label htmlFor="kode-admin" className="text-sm font-bold md:text-[15px]">
                Kode sesi
              </label>
              <input
                id="kode-admin"
                type="text"
                value={code}
                onChange={(event) => {
                  setCode(normalizeCode(event.target.value));
                  setError(null);
                }}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                className="box-border h-[60px] rounded-[14px] border border-line bg-field px-4 font-mono text-2xl font-bold uppercase tracking-[0.2em] text-fg focus:border-ring focus:outline-none md:h-16 md:px-[18px] md:text-[26px]"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="pin-admin" className="text-sm font-bold md:text-[15px]">
                PIN admin
              </label>
              <input
                id="pin-admin"
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                value={pin}
                onChange={(event) => {
                  setPin(event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH));
                  setError(null);
                }}
                autoComplete="off"
                autoFocus={code.length === CODE_LENGTH}
                aria-describedby="pin-bantu"
                aria-invalid={error ? true : undefined}
                className="box-border h-[60px] rounded-[14px] border-2 border-ring bg-field px-4 font-mono text-2xl font-bold tracking-[0.3em] text-fg focus:outline-none md:h-16 md:px-[18px] md:text-[26px]"
              />
              <span id="pin-bantu" className="text-[13px] text-muted md:text-sm">
                Maksimal 10 percobaan per menit. <span className="md:hidden">Sesi admin aktif 24 jam.</span>
              </span>
            </div>
            {error ? (
              <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
                <AlertCircleIcon size={18} />
                {error}
              </span>
            ) : null}
            <button
              type="submit"
              disabled={!ready || loading}
              className="mt-1 flex h-[60px] items-center justify-center gap-2.5 rounded-2xl bg-primary text-[17px] font-extrabold text-on-primary disabled:opacity-50"
            >
              Masuk
              {loading ? <SpinnerIcon size={20} /> : null}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
