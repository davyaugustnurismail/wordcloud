"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { AlertCircleIcon, CheckIcon, XIcon } from "../icons";

export type ToastTone = "success" | "error";

type ToastItem = { id: number; tone: ToastTone; message: string };

type ToastApi = {
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const SUCCESS_MS = 3200;
const ERROR_MS = 5200;
const MAX_VISIBLE = 3;

export function useToast(): ToastApi {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast harus dipakai di dalam ToastProvider");
  return value;
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (tone: ToastTone, message: string) => {
      const id = nextId.current++;
      setItems((current) => [...current.slice(-(MAX_VISIBLE - 1)), { id, tone, message }]);
      timers.current.set(
        id,
        setTimeout(() => dismiss(id), tone === "error" ? ERROR_MS : SUCCESS_MS),
      );
    },
    [dismiss],
  );

  useEffect(() => {
    const active = timers.current;
    return () => {
      for (const timer of active.values()) clearTimeout(timer);
    };
  }, []);

  const api = useMemo<ToastApi>(
    () => ({ success: (message) => push("success", message), error: (message) => push("error", message) }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4 md:bottom-6"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role={item.tone === "error" ? "alert" : "status"}
            className="pointer-events-auto flex max-w-[min(92vw,460px)] items-center gap-2.5 rounded-xl border border-line bg-surface py-2.5 pl-3.5 pr-2 text-sm font-bold text-fg shadow-lg"
          >
            <span className={item.tone === "error" ? "text-danger" : "text-live"}>
              {item.tone === "error" ? <AlertCircleIcon size={18} /> : <CheckIcon size={18} strokeWidth={2.6} />}
            </span>
            <span className="min-w-0 flex-1">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Tutup notifikasi"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border-0 bg-transparent text-muted"
            >
              <XIcon size={16} strokeWidth={2.4} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
