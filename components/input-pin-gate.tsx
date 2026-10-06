"use client";

import { useRouter } from "next/navigation";
import { useState, type CSSProperties, type FormEvent } from "react";
import { resolveInputTheme } from "@/lib/input-themes";
import { assetUrl, type SessionSettings } from "@/lib/settings";
import { AlertCircleIcon, LockIcon, SpinnerIcon } from "./icons";
import { useSanitizedField } from "./use-sanitized-field";

const MIN_PIN_LENGTH = 4;
const MAX_PIN_LENGTH = 6;

function pinError(status: number): string {
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 401) return "PIN salah. Cek lagi dengan panitia.";
  return "Tidak bisa memeriksa PIN. Coba lagi.";
}

export function InputPinGate({ code, settings }: { code: string; settings: SessionSettings }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const theme = resolveInputTheme(settings);
  const field = useSanitizedField({
    clean: (raw) => raw.replace(/\D/g, "").slice(0, MAX_PIN_LENGTH),
    onTyped: () => setError(null),
  });
  const pin = field.value;
  const ready = pin.length >= MIN_PIN_LENGTH;
  const blurOn = settings.cardBlur;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!ready || loading) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sessions/${code}/input-pin`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        setError(pinError(response.status));
        setLoading(false);
        field.setValue("");
        return;
      }
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      setLoading(false);
    }
  };

  const fieldStyle = {
    background: theme.field.background,
    borderColor: error ? theme.error.ring : theme.field.border,
    borderWidth: theme.box.borderWidth,
    color: theme.field.text,
    "--rest-shadow": theme.fieldShadow ?? "none",
    "--focus-shadow": theme.field.focusShadow,
  } as CSSProperties;

  return (
    <div className="relative flex min-h-view flex-col overflow-hidden" style={{ background: theme.background, color: theme.text }}>
      {theme.usesImage ? (
        <>
          {settings.inputBgId ? (
            <img
              src={assetUrl(settings.inputBgId)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : null}
          <div className="absolute inset-0" style={{ background: `rgba(0, 0, 0, ${settings.inputOverlay / 100})` }} />
        </>
      ) : null}

      <main className="relative flex flex-1 items-center justify-center px-[22px] py-10 md:px-14">
        <form
          onSubmit={submit}
          className="m-0 flex w-full max-w-[560px] flex-col gap-6 rounded-[26px] border px-5 py-8 md:gap-7 md:rounded-[36px] md:px-12 md:py-12"
          style={{
            background: blurOn ? theme.card.background : "transparent",
            borderColor: blurOn ? theme.card.border : "transparent",
            backdropFilter: blurOn ? "blur(18px)" : "none",
            WebkitBackdropFilter: blurOn ? "blur(18px)" : "none",
          }}
        >
          <div className="flex flex-col items-center gap-3 text-center">
            <span
              className="flex h-14 w-14 items-center justify-center rounded-full"
              style={{ background: theme.button.background, color: theme.button.color }}
            >
              <LockIcon size={28} strokeWidth={2.2} />
            </span>
            <h1 className="m-0 font-display text-[36px] font-extrabold leading-[1.05] md:text-[52px]">Masukkan PIN</h1>
            <p className="m-0 text-base font-semibold md:text-xl" style={{ color: theme.helper }}>
              Halaman ini dikunci. Minta PIN ke panitia untuk ikut mengirim kata.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <label htmlFor="pin-input" className="sr-only">
              PIN halaman input
            </label>
            <input
              id="pin-input"
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              {...field.inputProps}
              autoFocus
              autoComplete="off"
              aria-describedby="pin-bantu"
              aria-invalid={error ? true : undefined}
              placeholder="••••"
              className={`box-border h-[76px] w-full px-[18px] text-center font-mono text-[34px] font-bold tracking-[0.4em] placeholder:text-[#6E6E74] shadow-[var(--rest-shadow)] focus:outline-none focus:shadow-[var(--focus-shadow)] md:h-[104px] md:text-[48px] ${theme.box.fieldRadiusClass}`}
              style={fieldStyle}
            />
            <div
              id="pin-bantu"
              role={error ? "alert" : undefined}
              className="flex min-h-7 items-center justify-center gap-1.5 text-center text-sm font-bold md:text-lg"
              style={{ color: error ? theme.error.text : theme.helper }}
            >
              {error ? <AlertCircleIcon size={18} strokeWidth={2.6} /> : null}
              {error ?? `PIN ${MIN_PIN_LENGTH}–${MAX_PIN_LENGTH} angka.`}
            </div>
          </div>

          <button
            type="submit"
            disabled={!ready || loading}
            className={`flex h-[68px] items-center justify-center gap-2.5 border-0 font-display text-[28px] font-extrabold md:h-[88px] md:text-[38px] ${theme.box.buttonRadiusClass}`}
            style={{
              background: !ready || loading ? theme.button.disabledBackground : theme.button.background,
              color: !ready || loading ? theme.button.disabledColor : theme.button.color,
              boxShadow: theme.buttonShadow ?? undefined,
            }}
          >
            Lanjut
            {loading ? <SpinnerIcon size={22} /> : null}
          </button>
        </form>
      </main>
    </div>
  );
}
