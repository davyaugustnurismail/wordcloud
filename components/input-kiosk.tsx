"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { resolveInputTheme } from "@/lib/input-themes";
import { connectRealtime, getDeviceId, type RealtimeClient } from "@/lib/realtime/client";
import { assetUrl, type SessionSettings } from "@/lib/settings";
import { checkWord, countChars, hasInnerSpace, stripWord } from "@/lib/words";
import { ForbiddenWordDialog } from "./forbidden-word-dialog";
import { AlertCircleIcon, CheckIcon, SpinnerIcon, WifiOffIcon } from "./icons";
import { useSanitizedField } from "./use-sanitized-field";

type Props = {
  code: string;
  initialSettings: SessionSettings;
};

type InputError = "space" | "rate_limited" | "paused" | "ended" | "error";
type SentKind = "shown" | "pending";

const SENT_VISIBLE_MS = 1800;
const ACK_TIMEOUT_MS = 5000;

const errorMessages: Record<InputError, string> = {
  space: "Cukup satu kata ya",
  rate_limited: "Pelan-pelan ya, coba lagi sebentar",
  paused: "Input sedang dijeda, tunggu sebentar.",
  ended: "Sesi sudah berakhir. Terima kasih sudah ikut!",
  error: "Gagal terkirim, coba lagi",
};

const sentMessages: Record<SentKind, string> = {
  shown: "Terkirim — lihat layar!",
  pending: "Terkirim — menunggu persetujuan",
};

export function InputKiosk({ code, initialSettings }: Props) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState<InputError | null>(null);
  const [sent, setSent] = useState<SentKind | null>(null);
  const [paused, setPaused] = useState(false);
  const [ended, setEnded] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [forbidden, setForbidden] = useState<string | null>(null);
  const socketRef = useRef<RealtimeClient | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const sentTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const socket = connectRealtime({ code, role: "input", deviceId: getDeviceId() });
    socketRef.current = socket;

    socket.on("connect", () => setConnected(true));
    socket.on("disconnect", () => setConnected(false));
    socket.on("connect_error", (connectError) => {
      setConnected(false);
      if (connectError.message === "unauthorized") router.refresh();
    });
    socket.on("snapshot", (snapshot) => {
      setSettings(snapshot.settings);
      setPaused(snapshot.state.paused);
      setEnded(snapshot.state.ended);
    });
    socket.on("settings:update", setSettings);
    socket.on("session:state", (state) => {
      setPaused(state.paused);
      setEnded(state.ended);
    });

    return () => {
      clearTimeout(sentTimerRef.current);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [code, router]);

  const theme = resolveInputTheme(settings);
  const field = useSanitizedField({
    clean: (raw) => stripWord(raw, settings.maxChars),
    onTyped: (next) => {
      setError(hasInnerSpace(next) ? "space" : null);
      setSent(null);
    },
  });
  const value = field.value;
  const trimmed = value.trim();
  const blocked = paused || ended;
  const disabled = !connected || blocked || submitting || !trimmed || error === "space";

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const socket = socketRef.current;
    if (!socket || !connected || blocked || submitting) return;

    const checked = checkWord(value, settings.maxChars);
    if (!checked.ok) {
      if (checked.reason === "space") setError("space");
      return;
    }

    setSubmitting(true);
    socket.timeout(ACK_TIMEOUT_MS).emit("entry:submit", { text: checked.text }, (timeoutError, ack) => {
      setSubmitting(false);
      if (timeoutError || !ack) {
        setError("error");
        return;
      }
      if (ack.status !== "rejected") {
        field.setValue("");
        setError(null);
        setSent(ack.status);
        clearTimeout(sentTimerRef.current);
        sentTimerRef.current = setTimeout(() => setSent(null), SENT_VISIBLE_MS);
        inputRef.current?.focus();
        return;
      }
      if (ack.reason === "blocked") {
        setError(null);
        setForbidden(checked.text);
        return;
      }
      if (ack.reason === "invalid") {
        setError("error");
      } else {
        setError(ack.reason);
      }
    });
  };

  const statusStyle = connected ? theme.status : theme.offline;
  const showError = connected && (error !== null || blocked);
  const activeError: InputError | null = ended ? "ended" : paused ? "paused" : error;
  const message = !connected
    ? "Kata tidak hilang, tunggu sebentar."
    : activeError
      ? errorMessages[activeError]
      : "Cukup satu kata, tanpa spasi.";
  const blurOn = settings.cardBlur;

  const closeForbidden = () => {
    setForbidden(null);
    field.setValue("");
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const fieldStyle = {
    background: theme.field.background,
    borderColor: showError && !blocked ? theme.error.ring : theme.field.border,
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
      {!connected ? (
        <div
          role="status"
          className="relative flex items-center gap-2.5 px-[22px] py-3.5 text-sm font-bold md:px-14 md:text-base"
          style={{ background: "#FFF1DC", color: "#7A3E00" }}
        >
          <WifiOffIcon size={20} />
          Koneksi terputus. Menyambung ulang…
        </div>
      ) : null}

      <div className="relative flex flex-1 flex-col px-[22px] pt-6 md:px-14 md:pt-10">
        <div className="flex items-center justify-end">
          <div
            className={`flex items-center gap-1.5 text-[13px] font-semibold md:gap-2 md:text-[15px] ${
              statusStyle.chipBackground ? "h-[30px] rounded-full px-3 md:h-9 md:px-3.5" : ""
            }`}
            style={{ color: statusStyle.text, background: statusStyle.chipBackground ?? undefined }}
          >
            <span className="h-2 w-2 rounded-full md:h-2.5 md:w-2.5" style={{ background: statusStyle.dot }} />
            {connected ? "Terhubung" : "Offline"}
          </div>
        </div>

        <div className="flex flex-1 items-center justify-center pb-14 md:pb-10">
          <div className="relative w-full max-w-[926px]">
            {sent !== null ? (
              <div
                role="status"
                className="absolute bottom-full left-1/2 mb-4 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full py-[9px] pl-2.5 pr-4 text-base font-bold md:gap-2.5 md:py-3 md:pl-4 md:pr-[22px] md:text-xl"
                style={{ background: theme.sent.background, color: theme.sent.color }}
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full md:h-7 md:w-7"
                  style={{ background: theme.sent.check }}
                >
                  <CheckIcon size={16} strokeWidth={3} className="text-white" />
                </span>
                {sentMessages[sent]}
              </div>
            ) : null}

            <div
              className="flex flex-col gap-[22px] rounded-[26px] border px-5 py-6 md:gap-7 md:rounded-[36px] md:px-[52px] md:py-11"
              style={{
                background: blurOn ? theme.card.background : "transparent",
                borderColor: blurOn ? theme.card.border : "transparent",
                backdropFilter: blurOn ? "blur(18px)" : "none",
                WebkitBackdropFilter: blurOn ? "blur(18px)" : "none",
              }}
            >
              <div className="flex flex-col items-center gap-1.5 text-center md:gap-2.5">
                <label
                  htmlFor="kata"
                  className="whitespace-pre-line font-display text-[40px] font-extrabold leading-[1.04] md:text-[68px] md:leading-[1.02]"
                >
                  {settings.prompt}
                </label>
              </div>

              <form onSubmit={submit} className="m-0 flex flex-col gap-3 md:gap-[18px]">
                <input
                  ref={inputRef}
                  id="kata"
                  type="text"
                  {...field.inputProps}
                  placeholder="ketik satu kata"
                  autoFocus
                  autoComplete="off"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  enterKeyHint="send"
                  aria-describedby="bantu"
                  aria-invalid={showError ? true : undefined}
                  className={`box-border h-[76px] w-full px-[18px] text-center font-display text-[34px] font-extrabold placeholder:text-[#6E6E74] shadow-[var(--rest-shadow)] focus:outline-none focus:shadow-[var(--focus-shadow)] md:h-[116px] md:px-7 md:text-[56px] ${theme.box.fieldRadiusClass}`}
                  style={fieldStyle}
                />
                <div className="flex min-h-7 items-center justify-between gap-4">
                  <div
                    id="bantu"
                    role={showError ? "alert" : undefined}
                    className="flex items-center gap-1.5 text-sm font-bold md:gap-2 md:text-[19px]"
                    style={{ color: showError ? theme.error.text : theme.helper }}
                  >
                    {showError ? <AlertCircleIcon size={18} strokeWidth={2.6} /> : null}
                    {message}
                  </div>
                  <div
                    className="text-sm font-bold tabular-nums md:text-[17px]"
                    style={{ color: theme.helper }}
                  >
                    {countChars(value)}/{settings.maxChars}
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={disabled}
                  className={`flex h-[68px] items-center justify-center gap-2.5 border-0 font-extrabold md:h-24 ${
                    theme.box.buttonRadiusClass
                  } ${connected ? "font-display text-[30px] md:text-[42px]" : "font-sans text-xl"}`}
                  style={{
                    background: disabled ? theme.button.disabledBackground : theme.button.background,
                    color: disabled ? theme.button.disabledColor : theme.button.color,
                    boxShadow: theme.buttonShadow ?? undefined,
                  }}
                >
                  {connected ? (
                    "Kirim"
                  ) : (
                    <>
                      <SpinnerIcon size={20} />
                      Menunggu koneksi
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
      <ForbiddenWordDialog word={forbidden} theme={theme} onClose={closeForbidden} />
    </div>
  );
}
