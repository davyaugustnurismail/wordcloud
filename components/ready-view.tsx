"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { copyText } from "@/lib/clipboard";
import { connectRealtime } from "@/lib/realtime/client";
import type { PresencePayload } from "@/lib/realtime/events";
import { ArrowRightIcon, CheckIcon, CopyIcon, EyeIcon, PlayIcon } from "./icons";

type Props = {
  code: string;
  name: string;
  pin: string;
  joinLabel: string;
  joinQr: string;
  adminQr: string;
};

function formatPin(pin: string): string {
  return `${pin.slice(0, 3)} ${pin.slice(3)}`;
}

export function ReadyView({ code, name, pin, joinLabel, joinQr, adminQr }: Props) {
  const router = useRouter();
  const [presence, setPresence] = useState<PresencePayload>({ display: 0, input: 0, admin: 0 });
  const [showPin, setShowPin] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const socket = connectRealtime({ code, role: "ready" });
    socket.on("presence", setPresence);
    return () => {
      socket.disconnect();
    };
  }, [code]);

  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);

  const copyPin = async () => {
    setCopied(await copyText(pin));
  };

  const openAdmin = async () => {
    try {
      const response = await fetch(`/api/sessions/${code}/open-admin`, { method: "POST" });
      router.push(response.ok ? `/s/${code}/admin` : `/masuk-admin?kode=${code}`);
    } catch {
      router.push(`/masuk-admin?kode=${code}`);
    }
  };

  const start = async () => {
    try {
      await document.documentElement.requestFullscreen?.();
    } catch {}
    router.push(`/s/${code}/display`);
  };

  const live = presence.display > 0;

  return (
    <main className="flex flex-1 justify-center px-6 pb-14 pt-9">
      <div className="flex w-full max-w-[1120px] flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <div className="truncate text-sm font-bold text-muted">{name}</div>
            <h1 className="m-0 text-4xl font-extrabold tracking-[-0.02em]">Sesi siap tayang</h1>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <span className="flex h-[34px] items-center gap-2 rounded-full bg-live/15 px-3.5 text-sm font-bold text-live">
              <span className="h-2 w-2 rounded-full bg-live" />
              Input terhubung: {presence.input}
            </span>
            {live ? (
              <span className="flex h-[34px] items-center rounded-full bg-live/15 px-3.5 text-sm font-bold text-live">
                Sedang tayang
              </span>
            ) : (
              <span className="flex h-[34px] items-center rounded-full bg-warn/15 px-3.5 text-sm font-bold text-warn">
                Belum tayang
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap gap-5">
          <section className="flex min-w-0 flex-[999_1_560px] flex-col gap-[22px] rounded-[20px] border border-line bg-surface p-7">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-lg font-extrabold">Kode sesi untuk device input</h2>
              <p className="m-0 text-sm leading-normal text-muted">
                Buka {joinLabel} di device input, lalu ketik kode ini. Atau scan QR.
              </p>
            </div>
            <div className="flex gap-2 sm:gap-2.5" aria-label={`Kode sesi ${[...code].join(" ")}`}>
              {[...code].map((char, index) => (
                <span
                  key={index}
                  className="flex aspect-[76/92] max-w-[76px] flex-1 items-center justify-center rounded-[14px] bg-hl font-mono text-[clamp(28px,8vw,52px)] font-bold text-on-hl"
                >
                  {char}
                </span>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex flex-col items-center gap-2">
                <div
                  role="img"
                  aria-label="QR join sesi"
                  className="box-border h-[184px] w-[184px] rounded-[14px] border border-line bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
                  dangerouslySetInnerHTML={{ __html: joinQr }}
                />
                <span className="text-xs text-muted">QR join</span>
              </div>
              <ol className="m-0 flex min-w-0 flex-[1_1_260px] list-decimal flex-col gap-2.5 pl-5 text-[15px] leading-normal">
                <li>Device input apa saja: HP, tablet, atau laptop.</li>
                <li>Setelah join, device langsung masuk halaman input kiosk.</li>
                <li>Kode tanpa huruf ambigu: tidak ada O, 0, I, atau 1.</li>
              </ol>
            </div>
          </section>

          <section className="flex min-w-0 flex-[1_1_340px] flex-col gap-[18px] rounded-[20px] border border-line bg-surface p-7">
            <div className="flex flex-col gap-1">
              <h2 className="m-0 text-lg font-extrabold">Akses admin sesi</h2>
              <p className="m-0 text-sm leading-normal text-muted">
                Catat untuk operator. Device tanpa kamera cukup ketik kode dan PIN di Masuk sebagai admin sesi.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface2 px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">Kode sesi</span>
                  <span className="font-mono text-[26px] font-bold">{code}</span>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface2 px-4 py-3.5">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">PIN admin</span>
                  <span className="font-mono text-[26px] font-bold tracking-[0.06em]">
                    {showPin ? formatPin(pin) : "••• •••"}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPin((value) => !value)}
                    aria-label={showPin ? "Sembunyikan PIN" : "Tampilkan PIN"}
                    aria-pressed={showPin}
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg"
                  >
                    <EyeIcon size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={copyPin}
                    aria-label="Salin PIN"
                    className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg"
                  >
                    {copied ? <CheckIcon size={20} /> : <CopyIcon size={20} />}
                  </button>
                  <span role="status" className="sr-only">
                    {copied ? "PIN tersalin" : ""}
                  </span>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={openAdmin}
              className="flex h-[50px] items-center justify-center gap-2 rounded-[14px] border border-line text-[15px] font-bold text-fg"
            >
              <span>Buka admin sesi di device&nbsp;ini</span>
              <ArrowRightIcon size={18} strokeWidth={2.2} />
            </button>
            <div className="flex items-center gap-4 rounded-[14px] bg-surface2 px-4 py-3.5">
              <div
                role="img"
                aria-label="QR masuk admin sesi"
                className="box-border h-32 w-32 shrink-0 rounded-xl border border-line bg-white p-[9px] [&>svg]:h-full [&>svg]:w-full"
                dangerouslySetInnerHTML={{ __html: adminQr }}
              />
              <div className="flex flex-col gap-1">
                <span className="text-[15px] font-extrabold">QR admin sesi</span>
                <span className="text-[13px] leading-normal text-muted">
                  Jalan pintas untuk device berkamera. PIN tetap diminta.
                </span>
              </div>
            </div>
          </section>
        </div>

        <div className="flex flex-col gap-2.5">
          <button
            type="button"
            onClick={start}
            className="flex h-[76px] items-center justify-center gap-3 rounded-[18px] bg-primary text-[22px] font-extrabold text-on-primary"
          >
            <PlayIcon size={24} strokeWidth={2.2} />
            Mulai tayang
          </button>
          <p className="m-0 text-center text-sm text-muted">
            Masuk fullscreen, kursor disembunyikan, dan layar dijaga tetap menyala (Wake Lock).
          </p>
        </div>
      </div>
    </main>
  );
}
