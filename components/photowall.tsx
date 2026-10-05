"use client";

import { useEffect, useState } from "react";
import { connectRealtime } from "@/lib/realtime/client";
import type { EntryDto, SessionState } from "@/lib/realtime/events";
import type { SessionSettings } from "@/lib/settings";
import { WordcloudStage } from "./wordcloud-stage";

type Props = {
  code: string;
  initialSettings: SessionSettings;
};

const MAX_ENTRIES = 1000;

const IDLE_STATE: SessionState = { paused: false, frozen: false, clearedAt: null };

function insertEntry(list: EntryDto[], entry: EntryDto): EntryDto[] {
  const without = list.filter((existing) => existing.id !== entry.id);
  const index = without.findIndex((existing) => existing.shownAt < entry.shownAt);
  const next = index < 0 ? [...without, entry] : [...without.slice(0, index), entry, ...without.slice(index)];
  return next.slice(0, MAX_ENTRIES);
}

function useWakeLock() {
  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;
    let cancelled = false;

    const acquire = async () => {
      if (!("wakeLock" in navigator) || document.visibilityState !== "visible") return;
      try {
        const lock = await navigator.wakeLock.request("screen");
        if (cancelled) {
          void lock.release();
          return;
        }
        sentinel = lock;
      } catch {
        sentinel = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === "visible") void acquire();
    };

    void acquire();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVisibility);
      void sentinel?.release();
    };
  }, []);
}

export function Photowall({ code, initialSettings }: Props) {
  const [entries, setEntries] = useState<EntryDto[]>([]);
  const [settings, setSettings] = useState(initialSettings);
  const [state, setState] = useState<SessionState>(IDLE_STATE);

  useWakeLock();

  useEffect(() => {
    const socket = connectRealtime({ code, role: "display" });

    socket.on("snapshot", (snapshot) => {
      setSettings(snapshot.settings);
      setState(snapshot.state);
      setEntries(snapshot.entries);
    });
    socket.on("entry:shown", (entry) => setEntries((current) => insertEntry(current, entry)));
    socket.on("entry:hidden", ({ id }) => setEntries((current) => current.filter((entry) => entry.id !== id)));
    socket.on("entry:updated", ({ id, text }) =>
      setEntries((current) => current.map((entry) => (entry.id === id ? { ...entry, text } : entry))),
    );
    socket.on("session:state", (next) => {
      setState(next);
      const clearedAt = next.clearedAt;
      if (clearedAt !== null) {
        setEntries((current) => current.filter((entry) => entry.shownAt > clearedAt));
      }
    });
    socket.on("settings:update", setSettings);

    return () => {
      socket.disconnect();
    };
  }, [code]);

  return (
    <div className="fixed inset-0 cursor-none select-none">
      <WordcloudStage entries={entries} settings={settings} frozen={state.frozen} className="h-full w-full" />
    </div>
  );
}
