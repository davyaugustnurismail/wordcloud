"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircleIcon, ShieldIcon, SpinnerIcon } from "../icons";

const loginErrors: Record<string, string> = {
  google_not_registered: "Email Google ini belum terdaftar sebagai admin. Minta admin global menambahkannya di menu User.",
  google_inactive: "Akun ini dinonaktifkan. Hubungi admin global.",
  google_unverified: "Email Google ini belum terverifikasi, jadi tidak bisa dipakai masuk.",
  google_denied: "Login Google dibatalkan.",
  google_failed: "Login Google gagal. Coba lagi.",
  google_unavailable: "Login Google belum disiapkan di server ini. Pakai password admin.",
  rate_limited: "Terlalu banyak percobaan. Coba lagi sebentar.",
};

function passwordError(status: number): string {
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 401) return "Password salah.";
  return "Tidak bisa masuk. Coba lagi.";
}

function GoogleMark() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9.1 3.6l6.8-6.8C35.8 2.4 30.3 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.9 6.1C12.4 13.6 17.7 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.4c-.5 2.9-2.2 5.3-4.6 6.9l7.2 5.6c4.3-4 6.8-9.9 6.8-17z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.7c-.5-1.4-.8-3-.8-4.7s.3-3.2.8-4.7l-7.9-6.1C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.2-5.6c-2 1.4-4.6 2.3-8.7 2.3-6.3 0-11.6-4.1-13.5-9.8l-7.9 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

type Props = { googleEnabled: boolean; initialError: string | null };

export function GlobalLoginForm({ googleEnabled, initialError }: Props) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(initialError ? (loginErrors[initialError] ?? null) : null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!password || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        setError(passwordError(response.status));
        setLoading(false);
        return;
      }
      router.push("/admin");
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      setLoading(false);
    }
  };

  return (
    <main className="flex flex-1 items-center justify-center px-5 pb-16 pt-6">
      <div className="m-0 box-border flex w-full max-w-[420px] flex-col gap-5 rounded-[22px] border border-line bg-surface p-8">
        <div className="flex flex-col gap-2">
          <span className="flex h-7 items-center gap-1.5 self-start rounded-full bg-surface2 px-2.5 text-xs font-extrabold tracking-[0.06em]">
            <ShieldIcon size={14} strokeWidth={2.2} />
            ADMIN GLOBAL
          </span>
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Masuk</h1>
          <p className="m-0 text-[15px] leading-[1.55] text-muted">
            Kelola semua sesi, blocklist, default tema, user, dan unduh data.
          </p>
        </div>

        {error ? (
          <span role="alert" className="flex items-start gap-2 rounded-xl bg-danger/10 px-3.5 py-3 text-sm font-bold text-danger">
            <AlertCircleIcon size={18} className="mt-px shrink-0" />
            {error}
          </span>
        ) : null}

        {googleEnabled ? (
          <>
            <a
              href="/api/auth/google/start"
              onClick={() => setGoogleLoading(true)}
              aria-busy={googleLoading}
              className="flex h-14 items-center justify-center gap-3 rounded-[14px] border border-line bg-bg text-base font-extrabold text-fg"
            >
              {googleLoading ? <SpinnerIcon size={20} /> : <GoogleMark />}
              Masuk dengan Google
            </a>
            <div className="flex items-center gap-3 text-[13px] text-muted">
              <span className="h-px flex-1 bg-line" />
              atau pakai password
              <span className="h-px flex-1 bg-line" />
            </div>
          </>
        ) : null}

        <form onSubmit={submit} className="m-0 flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="pw-global" className="text-sm font-bold">
              Password admin
            </label>
            <input
              id="pw-global"
              type="password"
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setError(null);
              }}
              autoComplete="current-password"
              autoFocus={!googleEnabled}
              aria-invalid={error ? true : undefined}
              className="box-border h-[54px] rounded-xl border-2 border-ring bg-field px-4 text-[17px] text-fg focus:outline-none"
            />
          </div>
          <button
            type="submit"
            disabled={!password || loading}
            className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-primary text-base font-extrabold text-on-primary disabled:opacity-50"
          >
            Masuk
            {loading ? <SpinnerIcon size={20} /> : null}
          </button>
        </form>
        <Link href="/masuk-admin" className="self-center text-sm font-bold text-fg underline underline-offset-[3px]">
          Admin sesi? Masuk dengan kode dan PIN
        </Link>
      </div>
    </main>
  );
}
