"use client";

import { useEffect, useState, type ReactNode } from "react";

export function SettingsCard({ title, note, children }: { title: string; note?: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-[22px] rounded-[18px] border border-line bg-surface p-5 md:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="m-0 text-[19px] font-extrabold">{title}</h2>
        {note ? <span className="text-[13px] text-muted">{note}</span> : null}
      </div>
      {children}
    </section>
  );
}

export function RangeField({
  id,
  label,
  display,
  min,
  max,
  step,
  value,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  display: string;
  min: number;
  max: number;
  step: number;
  value: number;
  hint?: string;
  onChange: (value: number) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex justify-between text-sm font-bold">
        <span>{label}</span>
        <span className="tabular-nums text-muted">{display}</span>
      </label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="w-full accent-primary"
      />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  min,
  max,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    const next = Number(draft);
    if (Number.isInteger(next) && next >= min && next <= max) {
      if (next !== value) onCommit(next);
    } else {
      setDraft(String(value));
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === "Enter") commit();
        }}
        className="box-border h-11 w-full rounded-[10px] border border-line bg-field px-3 text-[15px] font-semibold text-fg focus:border-ring focus:outline-none"
      />
    </div>
  );
}

export function SwitchField({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl bg-surface2 px-4 py-3.5">
      <div className="flex flex-col gap-0.5">
        <span id={id} className="text-sm font-bold">
          {label}
        </span>
        <span className="text-[13px] text-muted">{description}</span>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        onClick={() => onChange(!checked)}
        className={`relative h-8 w-14 shrink-0 rounded-full border-0 p-0 ${checked ? "bg-live" : "bg-muted"}`}
      >
        <span
          className="absolute top-1 h-6 w-6 rounded-full bg-white transition-[left]"
          style={{ left: checked ? 28 : 4 }}
        />
      </button>
    </div>
  );
}
