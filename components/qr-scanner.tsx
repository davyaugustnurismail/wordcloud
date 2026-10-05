"use client";

import jsQR from "jsqr";
import { useEffect, useRef, useState } from "react";
import { sessionCodeFromQr } from "@/lib/qr-scan";
import { AlertCircleIcon, XIcon } from "./icons";

const SCAN_INTERVAL_MS = 160;
const SCAN_WIDTH = 640;

function cameraProblem(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  if (name === "NotAllowedError" || name === "SecurityError") return "Izin kamera ditolak. Izinkan kamera di pengaturan browser.";
  if (name === "NotFoundError" || name === "OverconstrainedError") return "Kamera tidak ditemukan di device ini.";
  return "Kamera tidak bisa dibuka. Coba lagi.";
}

export function QrScanner({ onCode, onClose }: { onCode: (code: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);

  useEffect(() => {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setProblem("Kamera hanya bisa dipakai lewat HTTPS atau localhost. Scan dengan aplikasi kamera bawaan HP, atau ketik kode sesi.");
      return;
    }

    let stopped = false;
    let stream: MediaStream | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });

    const scan = () => {
      const video = videoRef.current;
      if (!video || !context || video.readyState < 2 || video.videoWidth === 0) return;
      const scale = Math.min(1, SCAN_WIDTH / video.videoWidth);
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      const image = context.getImageData(0, 0, canvas.width, canvas.height);
      const result = jsQR(image.data, image.width, image.height, { inversionAttempts: "dontInvert" });
      if (!result) return;
      const code = sessionCodeFromQr(result.data);
      if (code) {
        setUnreadable(false);
        onCode(code);
      } else {
        setUnreadable(true);
      }
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false })
      .then((opened) => {
        if (stopped) {
          opened.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = opened;
        const video = videoRef.current;
        if (!video) return;
        video.srcObject = opened;
        void video.play().catch(() => undefined);
        timer = setInterval(scan, SCAN_INTERVAL_MS);
      })
      .catch((error: unknown) => {
        if (!stopped) setProblem(cameraProblem(error));
      });

    return () => {
      stopped = true;
      if (timer) clearInterval(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onCode]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Scan QR admin"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-5"
    >
      <div className="flex w-full max-w-[440px] flex-col gap-4 rounded-3xl border border-line bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-xl font-extrabold">Scan QR admin</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-transparent text-fg"
          >
            <XIcon size={18} />
          </button>
        </div>
        {problem ? (
          <div role="alert" className="flex items-start gap-2.5 rounded-2xl bg-surface2 p-4 text-sm font-semibold">
            <AlertCircleIcon size={20} className="mt-px shrink-0 text-danger" />
            {problem}
          </div>
        ) : (
          <div className="relative aspect-square overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
            <div className="pointer-events-none absolute inset-[18%] rounded-2xl border-2 border-primary" />
          </div>
        )}
        <p className="m-0 text-sm text-muted">
          {unreadable
            ? "QR terbaca, tapi bukan QR admin sesi. Arahkan ke QR di layar Siap tayang."
            : "Arahkan kamera ke QR admin sesi di layar Siap tayang. PIN tetap diminta."}
        </p>
      </div>
    </div>
  );
}
