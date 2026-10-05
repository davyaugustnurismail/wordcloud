"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { AlertCircleIcon, ShieldIcon, SpinnerIcon } from "../icons";

function loginError(status: number): string {
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 401) return "Password salah.";
  return "Tidak bisa masuk. Coba lagi.";
}

export function GlobalLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        setError(loginError(response.status));
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
      <form
        onSubmit={submit}
        className="m-0 box-border flex w-full max-w-[420px] flex-col gap-5 rounded-[22px] border border-line bg-surface p-8"
      >
        <div className="flex flex-col gap-2">
          <span className="flex h-7 items-center gap-1.5 self-start rounded-full bg-surface2 px-2.5 text-xs font-extrabold tracking-[0.06em]">
            <ShieldIcon size={14} strokeWidth={2.2} />
            ADMIN GLOBAL
          </span>
          <h1 className="m-0 text-[28px] font-extrabold tracking-[-0.02em]">Masuk</h1>
          <p className="m-0 text-[15px] leading-[1.55] text-muted">
            Kelola semua sesi, blocklist, default tema, dan unduh data.
          </p>
        </div>
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
            autoFocus
            aria-invalid={error ? true : undefined}
            className="box-border h-[54px] rounded-xl border-2 border-ring bg-field px-4 text-[17px] text-fg focus:outline-none"
          />
        </div>
        {error ? (
          <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertCircleIcon size={18} />
            {error}
          </span>
        ) : null}
        <button
          type="submit"
          disabled={!password || loading}
          className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-primary text-base font-extrabold text-on-primary disabled:opacity-50"
        >
          Masuk
          {loading ? <SpinnerIcon size={20} /> : null}
        </button>
        <Link
          href="/masuk-admin"
          className="self-center text-sm font-bold text-fg underline underline-offset-[3px]"
        >
          Admin sesi? Masuk dengan kode dan PIN
        </Link>
      </form>
    </main>
  );
}
