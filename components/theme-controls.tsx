"use client";

import { useEffect, useState } from "react";
import { composeColor, hexAlpha, minContrast, normalizeHex, scaleAlpha } from "@/lib/color";
import { inputBoxSpecs } from "@/lib/input-themes";
import {
  inputBoxStyles,
  MAX_PALETTE_COLORS,
  MAX_WORD_TRANSPARENCY,
  type InputBoxStyle,
  type PhotowallTheme,
} from "@/lib/settings";
import { paletteFor, palettePresets, photowallBackground, samePalette, wordOpacity } from "@/lib/wordcloud/palette";
import { AlertCircleIcon, CheckIcon, PlusIcon, XIcon } from "./icons";

const LOW_CONTRAST = 2.2;

type ColorFieldProps = {
  id: string;
  label: string;
  value: string | null;
  fallback: string;
  onChange: (hex: string) => void;
  onReset?: () => void;
  hint?: string;
};

const CHECKERBOARD = "conic-gradient(#c9c9c9 25%, #ffffff 0 50%, #c9c9c9 0 75%, #ffffff 0)";

export function ColorField({ id, label, value, fallback, onChange, onReset, hint }: ColorFieldProps) {
  const shown = (value ?? fallback).toLowerCase();
  const alpha = hexAlpha(shown);
  const transparency = Math.round((1 - alpha) * 100);
  const [draft, setDraft] = useState(shown);

  useEffect(() => {
    setDraft(shown);
  }, [shown]);

  const typeHex = (raw: string) => {
    setDraft(raw);
    const hex = normalizeHex(raw);
    if (hex && hex !== shown) onChange(hex);
  };

  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className="flex items-center justify-between gap-2 text-sm font-bold">
        <span>{label}</span>
        {value === null && onReset ? <span className="text-xs font-semibold text-muted">Otomatis</span> : null}
      </label>
      <div className="flex items-center gap-2.5">
        <input
          id={id}
          type="color"
          value={shown.slice(0, 7)}
          onChange={(event) => onChange(composeColor(event.target.value, alpha))}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-[10px] border border-line bg-field p-1"
        />
        <span
          aria-hidden="true"
          className="relative h-11 w-11 shrink-0 overflow-hidden rounded-[10px] border border-line"
          style={{ backgroundImage: CHECKERBOARD, backgroundSize: "12px 12px" }}
        >
          <span className="absolute inset-0" style={{ background: shown }} />
        </span>
        <input
          type="text"
          aria-label={`${label}, kode hex`}
          value={draft}
          maxLength={9}
          spellCheck={false}
          autoComplete="off"
          onChange={(event) => typeHex(event.target.value)}
          onBlur={() => setDraft(shown)}
          className="box-border h-11 w-[124px] min-w-0 rounded-[10px] border border-line bg-field px-3 font-mono text-sm font-bold uppercase text-fg focus:border-ring focus:outline-none"
        />
        {onReset && value !== null ? (
          <button
            type="button"
            onClick={onReset}
            className="h-9 shrink-0 rounded-lg border border-line bg-transparent px-3 text-[13px] font-bold text-muted"
          >
            Otomatis
          </button>
        ) : null}
      </div>
      <div className="flex items-center gap-2.5">
        <label htmlFor={`${id}-transparansi`} className="w-[92px] shrink-0 text-xs font-semibold text-muted">
          Transparansi
        </label>
        <input
          id={`${id}-transparansi`}
          type="range"
          min={0}
          max={100}
          step={1}
          value={transparency}
          onChange={(event) => onChange(composeColor(shown, 1 - Number(event.target.value) / 100))}
          className="min-w-0 grow accent-primary"
        />
        <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums">{transparency}%</span>
      </div>
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

type PresetChipProps = {
  label: string;
  colors: readonly string[];
  selected: boolean;
  lowContrast: boolean;
  onClick: () => void;
};

function PresetChip({ label, colors, selected, lowContrast, onClick }: PresetChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      title={lowContrast ? "Kontras rendah di latar ini" : undefined}
      onClick={onClick}
      className={`flex items-center gap-2 rounded-xl border-2 px-2.5 py-1.5 text-left text-[13px] font-bold ${
        selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
      } ${lowContrast ? "opacity-60" : ""}`}
    >
      <span className="flex -space-x-1">
        {colors.slice(0, 5).map((color, index) => (
          <span
            key={index}
            className="h-4 w-4 rounded-full border border-black/30 ring-1 ring-white/20"
            style={{ background: color }}
          />
        ))}
      </span>
      {label}
    </button>
  );
}

type PaletteFieldProps = {
  theme: PhotowallTheme;
  color: string;
  palette: string[] | null;
  transparency: number;
  onChange: (palette: string[] | null) => void;
  onTransparencyChange: (transparency: number) => void;
};

export function PaletteField({ theme, color, palette, transparency, onChange, onTransparencyChange }: PaletteFieldProps) {
  const [editing, setEditing] = useState(false);
  const base = paletteFor(theme, null, color);
  const colors = palette ?? base;
  const background = theme === "foto" ? null : photowallBackground(theme, color);
  const opacity = wordOpacity(transparency);
  const fade = (list: readonly string[]) => list.map((item) => scaleAlpha(item, opacity));
  const lowContrast = background !== null && minContrast(fade(colors), background) < LOW_CONTRAST;
  const matchesPreset = palette !== null && palettePresets.some((preset) => samePalette(palette, preset.colors));

  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className="text-sm font-bold">Palet warna tulisan</span>
      <div role="group" aria-label="Pilih palet" className="flex flex-wrap gap-2">
        <PresetChip label="Bawaan tema" colors={base} selected={palette === null} lowContrast={false} onClick={() => onChange(null)} />
        {palettePresets.map((preset) => (
          <PresetChip
            key={preset.id}
            label={preset.label}
            colors={preset.colors}
            selected={samePalette(palette, preset.colors)}
            lowContrast={background !== null && minContrast(fade(preset.colors), background) < LOW_CONTRAST}
            onClick={() => onChange([...preset.colors])}
          />
        ))}
      </div>
      <div className="flex items-center gap-2.5">
        <label htmlFor="transparansi-kata" className="w-[92px] shrink-0 text-xs font-semibold text-muted">
          Transparansi kata
        </label>
        <input
          id="transparansi-kata"
          type="range"
          min={0}
          max={MAX_WORD_TRANSPARENCY}
          step={1}
          value={transparency}
          onChange={(event) => onTransparencyChange(Number(event.target.value))}
          className="min-w-0 grow accent-primary"
        />
        <span className="w-10 shrink-0 text-right text-xs font-bold tabular-nums">{transparency}%</span>
      </div>
      {lowContrast ? (
        <span role="status" className="flex items-center gap-1.5 text-[13px] font-bold text-warn">
          <AlertCircleIcon size={16} />
          Palet ini kurang kontras dengan warna latar, kata bisa sulit dibaca.
        </span>
      ) : null}
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((existing, index) =>
          editing ? (
            <span key={index} className="relative">
              <input
                type="color"
                value={existing.toLowerCase()}
                aria-label={`Warna ${index + 1}`}
                onChange={(event) => onChange(colors.map((item, i) => (i === index ? event.target.value : item)))}
                className="h-[30px] w-[30px] cursor-pointer rounded-lg border border-line bg-transparent p-0"
              />
              {colors.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Hapus warna ${index + 1}`}
                  onClick={() => onChange(colors.filter((_, i) => i !== index))}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-solid text-white"
                >
                  <XIcon size={10} strokeWidth={3} />
                </button>
              ) : null}
            </span>
          ) : (
            <span key={index} className="h-[30px] w-[30px] rounded-lg border border-line" style={{ background: existing }} />
          ),
        )}
        {editing && colors.length < MAX_PALETTE_COLORS ? (
          <button
            type="button"
            aria-label="Tambah warna"
            onClick={() => onChange([...colors, "#ffffff"])}
            className="flex h-[30px] w-[30px] items-center justify-center rounded-lg border border-dashed border-line-strong text-muted"
          >
            <PlusIcon size={16} />
          </button>
        ) : null}
        <button
          type="button"
          aria-pressed={editing}
          onClick={() => setEditing((value) => !value)}
          className="ml-1.5 h-8 rounded-lg border border-line bg-transparent px-3 text-[13px] font-bold text-fg"
        >
          {editing ? "Selesai" : "Ubah"}
        </button>
        {editing && palette ? (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="h-8 rounded-lg border border-line bg-transparent px-3 text-[13px] font-bold text-muted"
          >
            Reset ke bawaan
          </button>
        ) : null}
        {palette && !matchesPreset ? <span className="text-xs font-semibold text-muted">Palet buatan sendiri</span> : null}
      </div>
    </div>
  );
}

type BoxSample = { background: string; field: string; border: string; text: string };

type BoxStyleFieldProps = {
  value: InputBoxStyle;
  sample: BoxSample;
  onChange: (style: InputBoxStyle) => void;
};

function miniBorder(width: string): string {
  return width.includes(" ") ? "0 0 2px 0" : "2px";
}

export function BoxStyleField({ value, sample, onChange }: BoxStyleFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2.5">
      <span className="text-sm font-bold">Jenis kotak input</span>
      <div role="group" aria-label="Jenis kotak input" className="grid grid-cols-[repeat(auto-fill,minmax(110px,1fr))] gap-2.5">
        {inputBoxStyles.map((style) => {
          const spec = inputBoxSpecs[style];
          const selected = style === value;
          return (
            <button
              key={style}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(style)}
              className={`flex min-w-0 flex-col gap-2 rounded-[14px] border-2 p-2 text-left ${
                selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
              }`}
            >
              <span
                className="relative flex h-[52px] items-center justify-center overflow-hidden rounded-[9px] border border-line"
                style={{ background: sample.background }}
              >
                <span
                  className="box-border flex h-[26px] w-[78%] items-center justify-center text-[11px] font-extrabold"
                  style={{
                    background: spec.transparentField ? "transparent" : sample.field,
                    color: spec.transparentField ? sample.text : "#0C0C0C",
                    borderColor: sample.border,
                    borderWidth: miniBorder(spec.previewBorderWidth),
                    borderRadius: spec.previewFieldRadius === "10px" ? "7px" : spec.previewFieldRadius,
                    boxShadow: spec.offsetShadow ? `3px 3px 0 0 ${sample.border}` : undefined,
                  }}
                >
                  kata
                </span>
              </span>
              <span className="flex items-center justify-between px-1 pb-0.5 text-[13px] font-extrabold">
                {spec.label}
                {selected ? <CheckIcon size={16} strokeWidth={2.6} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
