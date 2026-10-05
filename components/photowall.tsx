"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { connectRealtime } from "@/lib/realtime/client";
import type { EntryDto, SessionState } from "@/lib/realtime/events";
import type { CaseStyle, SessionSettings } from "@/lib/settings";
import { computeLayout, type PlacedWord } from "@/lib/wordcloud/layout";
import { loadWordFont, measureInk, WORD_FONT_FAMILY } from "@/lib/wordcloud/measure";
import { photowallBackgrounds, pickWordColor } from "@/lib/wordcloud/palette";

type Props = {
  code: string;
  initialSettings: SessionSettings;
};

type Pose = { x: number; y: number; fs: number };

const MAX_ENTRIES = 1000;
const MOVE_MS = 700;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MIN_MOVE_PX = 0.5;

const IDLE_STATE: SessionState = { paused: false, frozen: false, clearedAt: null };

function insertEntry(list: EntryDto[], entry: EntryDto): EntryDto[] {
  const without = list.filter((existing) => existing.id !== entry.id);
  const index = without.findIndex((existing) => existing.shownAt < entry.shownAt);
  const next = index < 0 ? [...without, entry] : [...without.slice(0, index), entry, ...without.slice(index)];
  return next.slice(0, MAX_ENTRIES);
}

function applyCase(text: string, style: CaseStyle): string {
  if (style === "kapital") return text.toUpperCase();
  if (style === "kecil") return text.toLowerCase();
  return text;
}

function useWindowSize() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  useEffect(() => {
    const update = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return size;
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
  const [placed, setPlaced] = useState<PlacedWord[]>([]);
  const [fontReady, setFontReady] = useState(false);
  const size = useWindowSize();

  const nodesRef = useRef(new Map<string, HTMLElement>());
  const previousRef = useRef(new Map<string, Pose>());
  const initialLayoutRef = useRef(true);
  const hintRef = useRef({ key: "", scale: 0 });
  const placedCountRef = useRef(0);

  const liveIds = useMemo(() => new Set(entries.map((entry) => entry.id)), [entries]);
  const visibleWords = useMemo(() => placed.filter((word) => liveIds.has(word.id)), [placed, liveIds]);
  const frozen = state.frozen;

  useWakeLock();

  useEffect(() => {
    let active = true;
    void loadWordFont().then(() => {
      if (active) setFontReady(true);
    });
    return () => {
      active = false;
    };
  }, []);

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

  useEffect(() => {
    if (!fontReady || size.w === 0 || size.h === 0) return;
    if (frozen && placedCountRef.current > 0) return;
    const frame = requestAnimationFrame(() => {
      const words = entries.slice(0, settings.maxWords).map((entry) => {
        const text = applyCase(entry.text, settings.caseStyle);
        return { id: entry.id, text, metrics: measureInk(text) };
      });
      const key = [size.w, size.h, settings.k, settings.minRatio, settings.safePct, settings.maxPct].join("|");
      const hint = hintRef.current.key === key ? hintRef.current.scale : undefined;
      const result = computeLayout(
        words,
        {
          width: size.w,
          height: size.h,
          k: settings.k,
          minRatio: settings.minRatio,
          safePct: settings.safePct,
          maxPct: settings.maxPct,
        },
        hint,
      );
      hintRef.current = { key, scale: result.scale };
      placedCountRef.current = result.placed.length;
      setPlaced(result.placed);
    });
    return () => cancelAnimationFrame(frame);
  }, [entries, settings, size, fontReady, frozen]);

  useLayoutEffect(() => {
    const previous = previousRef.current;
    const next = new Map<string, Pose>();
    const animate = !initialLayoutRef.current;

    for (const word of placed) {
      next.set(word.id, { x: word.x, y: word.y, fs: word.fs });
      const node = nodesRef.current.get(word.id);
      if (!node || !animate) continue;

      const target = `translate(${word.x}px, ${word.y}px) scale(1)`;
      const running = node.getAnimations();
      const before = previous.get(word.id);
      let from: string | null = null;

      if (running.length > 0) {
        const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform);
        from = `translate(${matrix.e}px, ${matrix.f}px) scale(${matrix.a})`;
        for (const animation of running) animation.cancel();
      } else if (before) {
        const moved = Math.abs(before.x - word.x) > MIN_MOVE_PX || Math.abs(before.y - word.y) > MIN_MOVE_PX;
        const resized = Math.abs(before.fs - word.fs) > 0.1;
        if (moved || resized) {
          from = `translate(${before.x}px, ${before.y}px) scale(${before.fs / word.fs})`;
        }
      } else if (word.rank === 0) {
        const cx = word.x + node.offsetWidth / 2;
        const cy = word.y + word.lh / 2;
        node.animate(
          [
            { transform: `translate(${cx}px, ${cy}px) scale(0.02)`, opacity: 0 },
            { transform: target, opacity: 1 },
          ],
          { duration: MOVE_MS, easing: EASING },
        );
        continue;
      } else {
        node.animate([{ opacity: 0 }, { opacity: 1 }], { duration: MOVE_MS, easing: EASING });
        continue;
      }

      if (from) {
        node.animate([{ transform: from }, { transform: target }], { duration: MOVE_MS, easing: EASING });
      }
    }

    previousRef.current = next;
    if (placed.length > 0) initialLayoutRef.current = false;
  }, [placed]);

  return (
    <div
      className="fixed inset-0 cursor-none select-none overflow-hidden"
      style={{ background: photowallBackgrounds[settings.photowallTheme], fontFamily: WORD_FONT_FAMILY }}
    >
      {visibleWords.map((word) => (
        <span
          key={word.id}
          ref={(node) => {
            if (node) nodesRef.current.set(word.id, node);
            else nodesRef.current.delete(word.id);
          }}
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            transform: `translate(${word.x}px, ${word.y}px)`,
            transformOrigin: "0 0",
            willChange: "transform",
            fontSize: word.fs,
            lineHeight: `${word.lh}px`,
            height: word.lh,
            fontWeight: 800,
            whiteSpace: "nowrap",
            color: pickWordColor(settings.photowallTheme, word.id),
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}
