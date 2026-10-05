"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { assetUrl, type CaseStyle, type PhotowallFont, type SessionSettings } from "@/lib/settings";
import { cssFontFamily, fontSpecs } from "@/lib/wordcloud/fonts";
import { computeLayout, type PlacedWord } from "@/lib/wordcloud/layout";
import { loadWordFont, measureInk } from "@/lib/wordcloud/measure";
import { paletteFor, photowallBackgrounds, pickWordColor } from "@/lib/wordcloud/palette";

export type StageEntry = { id: string; text: string };

export type StageSettings = Pick<
  SessionSettings,
  | "photowallTheme"
  | "photowallBgId"
  | "photowallOverlay"
  | "photowallFont"
  | "palette"
  | "caseStyle"
  | "k"
  | "minRatio"
  | "maxPct"
  | "safePct"
  | "maxWords"
>;

type Props = {
  entries: readonly StageEntry[];
  settings: StageSettings;
  frozen?: boolean;
  animate?: boolean;
  className?: string;
};

type Pose = { x: number; y: number; fs: number };

const MOVE_MS = 700;
const EASING = "cubic-bezier(0.22, 1, 0.36, 1)";
const MIN_MOVE_PX = 0.5;

function applyCase(text: string, style: CaseStyle): string {
  if (style === "kapital") return text.toUpperCase();
  if (style === "kecil") return text.toLowerCase();
  return text;
}

export function WordcloudStage({ entries, settings, frozen = false, animate = true, className = "" }: Props) {
  const { photowallFont: font, caseStyle, k, minRatio, maxPct, safePct, maxWords } = settings;

  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [loadedFont, setLoadedFont] = useState<PhotowallFont | null>(null);
  const [placed, setPlaced] = useState<PlacedWord[]>([]);

  const nodesRef = useRef(new Map<string, HTMLElement>());
  const previousRef = useRef(new Map<string, Pose>());
  const initialLayoutRef = useRef(true);
  const hintRef = useRef({ key: "", scale: 0 });
  const placedCountRef = useRef(0);

  const liveIds = useMemo(() => new Set(entries.map((entry) => entry.id)), [entries]);
  const visibleWords = useMemo(() => placed.filter((word) => liveIds.has(word.id)), [placed, liveIds]);
  const palette = useMemo(
    () => paletteFor(settings.photowallTheme, settings.palette),
    [settings.photowallTheme, settings.palette],
  );
  const fontReady = loadedFont === font;

  useLayoutEffect(() => {
    const element = containerRef.current;
    if (!element) return;
    const read = () => setSize({ w: element.clientWidth, h: element.clientHeight });
    read();
    const observer = new ResizeObserver(read);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let active = true;
    void loadWordFont(font).then(() => {
      if (active) setLoadedFont(font);
    });
    return () => {
      active = false;
    };
  }, [font]);

  useEffect(() => {
    if (!fontReady || size.w === 0 || size.h === 0) return;
    if (frozen && placedCountRef.current > 0) return;
    const frame = requestAnimationFrame(() => {
      const words = entries.slice(0, maxWords).map((entry) => {
        const text = applyCase(entry.text, caseStyle);
        return { id: entry.id, text, metrics: measureInk(text, font) };
      });
      const key = [size.w, size.h, font, k, minRatio, safePct, maxPct].join("|");
      const hint = hintRef.current.key === key ? hintRef.current.scale : undefined;
      const result = computeLayout(
        words,
        { width: size.w, height: size.h, k, minRatio, safePct, maxPct },
        hint,
      );
      hintRef.current = { key, scale: result.scale };
      placedCountRef.current = result.placed.length;
      setPlaced(result.placed);
    });
    return () => cancelAnimationFrame(frame);
  }, [entries, size, fontReady, frozen, font, caseStyle, k, minRatio, maxPct, safePct, maxWords]);

  useLayoutEffect(() => {
    const previous = previousRef.current;
    const next = new Map<string, Pose>();
    const shouldAnimate = animate && !initialLayoutRef.current;

    for (const word of placed) {
      next.set(word.id, { x: word.x, y: word.y, fs: word.fs });
      const node = nodesRef.current.get(word.id);
      if (!node || !shouldAnimate) continue;

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
  }, [placed, animate]);

  const theme = settings.photowallTheme;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{ background: photowallBackgrounds[theme], fontFamily: cssFontFamily(font) }}
    >
      {theme === "foto" ? (
        <>
          {settings.photowallBgId ? (
            <img
              src={assetUrl(settings.photowallBgId)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
              draggable={false}
            />
          ) : null}
          <div className="absolute inset-0" style={{ background: `rgba(0, 0, 0, ${settings.photowallOverlay / 100})` }} />
        </>
      ) : null}
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
            fontWeight: fontSpecs[font].weight,
            whiteSpace: "nowrap",
            color: pickWordColor(palette, word.id),
          }}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
}
