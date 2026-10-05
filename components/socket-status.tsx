"use client";

import { useEffect, useState } from "react";
import { connectRealtime } from "@/lib/realtime/client";

type Status = { state: "menyambung" | "terhubung" | "terputus"; rttMs?: number };

export function SocketStatus() {
  const [status, setStatus] = useState<Status>({ state: "menyambung" });

  useEffect(() => {
    const socket = connectRealtime();

    socket.on("connect", () => {
      const sentAt = performance.now();
      socket.emit("ping:check", () => {
        setStatus({ state: "terhubung", rttMs: Math.round(performance.now() - sentAt) });
      });
    });
    socket.on("disconnect", () => setStatus({ state: "terputus" }));
    socket.on("connect_error", () => setStatus({ state: "terputus" }));

    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <p className="text-sm text-muted" role="status">
      Socket: {status.state}
      {status.rttMs !== undefined ? ` (${status.rttMs} ms)` : ""}
    </p>
  );
}
