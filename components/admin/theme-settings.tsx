"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { demoEntries } from "@/lib/demo-words";
import { checkImageFile } from "@/lib/image-file";
import { uploadSessionImage, type UploadKind } from "@/lib/upload-client";
import {
  assetUrl,
  caseStyles,
  inputThemes,
  MAX_PALETTE_COLORS,
  photowallFonts,
  photowallThemes,
  type CaseStyle,
  type InputTheme,
  type PhotowallFont,
  type PhotowallTheme,
} from "@/lib/settings";
import { fontSpecs } from "@/lib/wordcloud/fonts";
import { defaultPalettes } from "@/lib/wordcloud/palette";
import { BackgroundPicker } from "../background-picker";
import { CheckIcon, PlusIcon, XIcon } from "../icons";
import { useAdmin } from "./admin-provider";
import { InputPreview } from "./input-preview";
import { PhotowallPreview } from "./photowall-preview";
import { NumberField, RangeField, SettingsCard, SwitchField } from "./settings-fields";

export type AssetLists = { photowall: string[]; input: string[] };

type Props = {
  code: string;
  library: AssetLists;
  own: AssetLists;
};

const photowallSwatches: Record<PhotowallTheme, { label: string; background: string; word: string }> = {
  hitam: { label: "Hitam", background: "#000000", word: "#FFE14D" },
  putih: { label: "Putih", background: "#FFFFFF", word: "#0B2E8A" },
  foto: { label: "Foto", background: "#000000", word: "#FFFFFF" },
};

const inputSwatches: Record<InputTheme, { label: string; background: string; field: string; fieldBorder: string }> = {
  reggae: { label: "Reggae", background: "#0C0C0C", field: "#FFFFFF", fieldBorder: "#0C0C0C" },
  hitam: { label: "Hitam", background: "#000000", field: "#141416", fieldBorder: "#FFE14D" },
  putih: { label: "Putih", background: "#FFFFFF", field: "#F6F5F1", fieldBorder: "#141416" },
  foto: { label: "Foto", background: "#000000", field: "#FFFFFF", fieldBorder: "#FFFFFF" },
};

const caseLabels: Record<CaseStyle, string> = { kecil: "kecil", asli: "Asli", kapital: "KAPITAL" };

function themeCardClass(selected: boolean) {
  return `flex min-w-0 flex-col gap-2 rounded-[14px] border-2 p-2 text-left ${
    selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
  }`;
}

function SaveIndicator() {
  const { saveState } = useAdmin();
  if (saveState === "saving") return <span className="text-[13px] font-bold text-muted">Menyimpan…</span>;
  if (saveState === "error") return <span className="text-[13px] font-bold text-danger">Gagal menyimpan</span>;
  return (
    <span className="flex items-center gap-1.5 text-[13px] font-bold text-live">
      <CheckIcon size={16} strokeWidth={2.6} />
      Tersimpan otomatis
    </span>
  );
}

function PaletteEditor() {
  const { settings, patchSettings } = useAdmin();
  const [editing, setEditing] = useState(false);
  const colors = settings.palette ?? defaultPalettes[settings.photowallTheme];

  const update = (next: string[]) => patchSettings({ palette: next });

  return (
    <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
      <span className="text-sm font-bold">Palet warna</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {colors.map((color, index) =>
          editing ? (
            <span key={index} className="relative">
              <input
                type="color"
                value={color.toLowerCase()}
                aria-label={`Warna ${index + 1}`}
                onChange={(event) => update(colors.map((existing, i) => (i === index ? event.target.value : existing)))}
                className="h-[30px] w-[30px] cursor-pointer rounded-lg border border-line bg-transparent p-0"
              />
              {colors.length > 1 ? (
                <button
                  type="button"
                  aria-label={`Hapus warna ${index + 1}`}
                  onClick={() => update(colors.filter((_, i) => i !== index))}
                  className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-danger-solid text-white"
                >
                  <XIcon size={10} strokeWidth={3} />
                </button>
              ) : null}
            </span>
          ) : (
            <span key={index} className="h-[30px] w-[30px] rounded-lg border border-line" style={{ background: color }} />
          ),
        )}
        {editing && colors.length < MAX_PALETTE_COLORS ? (
          <button
            type="button"
            aria-label="Tambah warna"
            onClick={() => update([...colors, "#ffffff"])}
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
        {editing && settings.palette ? (
          <button
            type="button"
            onClick={() => patchSettings({ palette: null }, true)}
            className="h-8 rounded-lg border border-line bg-transparent px-3 text-[13px] font-bold text-muted"
          >
            Reset ke bawaan
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function ThemeSettings({ code, library, own }: Props) {
  const { settings, patchSettings } = useAdmin();
  const [uploaded, setUploaded] = useState<AssetLists>(own);
  const [uploading, setUploading] = useState<UploadKind | null>(null);
  const [photowallBgError, setPhotowallBgError] = useState<string | null>(null);
  const [inputBgError, setInputBgError] = useState<string | null>(null);
  const [promptDraft, setPromptDraft] = useState(settings.prompt);
  const promptRef = useRef<HTMLInputElement>(null);

  const photowallIds = useMemo(() => [...library.photowall, ...uploaded.photowall], [library.photowall, uploaded.photowall]);
  const inputIds = useMemo(() => [...library.input, ...uploaded.input], [library.input, uploaded.input]);
  const preview = useMemo(() => demoEntries(140, "bahagia", 7), []);

  useEffect(() => {
    if (document.activeElement !== promptRef.current) setPromptDraft(settings.prompt);
  }, [settings.prompt]);

  const pickPhotowallTheme = (theme: PhotowallTheme) => {
    const needsBackground = theme === "foto" && !settings.photowallBgId && photowallIds[0];
    patchSettings(needsBackground ? { photowallTheme: theme, photowallBgId: photowallIds[0] } : { photowallTheme: theme }, true);
  };

  const pickInputTheme = (theme: InputTheme) => {
    const needsBackground = theme === "foto" && !settings.inputBgId && inputIds[0];
    patchSettings(needsBackground ? { inputTheme: theme, inputBgId: inputIds[0] } : { inputTheme: theme }, true);
  };

  const upload = async (kind: UploadKind, file: File) => {
    const setError = kind === "photowall_bg" ? setPhotowallBgError : setInputBgError;
    const problem = checkImageFile(file);
    setError(problem);
    if (problem) return;

    setUploading(kind);
    const result = await uploadSessionImage(code, kind, file);
    setUploading(null);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (kind === "photowall_bg") {
      setUploaded((current) => ({ ...current, photowall: [...current.photowall, result.id] }));
      patchSettings({ photowallBgId: result.id }, true);
    } else {
      setUploaded((current) => ({ ...current, input: [...current.input, result.id] }));
      patchSettings({ inputBgId: result.id }, true);
    }
  };

  const photowallFoto = settings.photowallBgId ? assetUrl(settings.photowallBgId) : null;
  const inputFoto = settings.inputBgId ? assetUrl(settings.inputBgId) : null;

  return (
    <main className="flex flex-1 flex-wrap items-start gap-6 px-4 py-4 md:px-8 md:pb-12 md:pt-6">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <SettingsCard title="Photowall" note="Terkirim realtime ke layar">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold">Tema</span>
            <div className="flex flex-wrap gap-2.5">
              {photowallThemes.map((theme) => {
                const swatch = photowallSwatches[theme];
                const selected = settings.photowallTheme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickPhotowallTheme(theme)}
                    className={`${themeCardClass(selected)} flex-[1_1_150px]`}
                  >
                    <span
                      className="relative block h-[70px] overflow-hidden rounded-[9px] border border-line"
                      style={{ background: swatch.background }}
                    >
                      {theme === "foto" && photowallFoto ? (
                        <img src={photowallFoto} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
                      ) : null}
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[26px] font-extrabold leading-none"
                        style={{ color: swatch.word }}
                      >
                        seru
                      </span>
                    </span>
                    <span className="px-1 pb-0.5 text-sm font-extrabold">{swatch.label}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[13px] leading-normal text-muted">
              Hitam paling cocok untuk infocus. Putih dan Foto menyinari badan orang yang berfoto.
            </span>
          </div>

          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
              <span className="text-sm font-bold">Gambar latar photowall (tema Foto)</span>
              <BackgroundPicker
                ids={photowallIds}
                selectedId={settings.photowallBgId}
                size="md"
                ariaSubject="photowall"
                uploadLabel="Upload foto latar photowall"
                uploading={uploading === "photowall_bg"}
                error={photowallBgError}
                onSelectId={(id) => {
                  setPhotowallBgError(null);
                  patchSettings({ photowallBgId: id }, true);
                }}
                onPickFile={(file) => upload("photowall_bg", file)}
              />
              <span className="text-xs text-muted">Dikompres ke lebar maksimal 1920 px.</span>
            </div>
            <div className="min-w-0 flex-[1_1_220px]">
              <RangeField
                id="overlay"
                label="Overlay gelap"
                display={`${settings.photowallOverlay}%`}
                min={0}
                max={85}
                step={5}
                value={settings.photowallOverlay}
                onChange={(value) => patchSettings({ photowallOverlay: value })}
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-5">
            <PaletteEditor />
            <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-2.5">
              <label htmlFor="font" className="text-sm font-bold">
                Font
              </label>
              <select
                id="font"
                value={settings.photowallFont}
                onChange={(event) => patchSettings({ photowallFont: event.target.value as PhotowallFont }, true)}
                className="box-border h-11 rounded-[10px] border border-line bg-field px-3 text-[15px] font-semibold text-fg"
              >
                {photowallFonts.map((font) => (
                  <option key={font} value={font}>
                    {fontSpecs[font].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-x-7 gap-y-5 sm:grid-cols-2">
            <RangeField
              id="maxpct"
              label="Ukuran terbesar"
              display={`${settings.maxPct}% tinggi layar`}
              min={15}
              max={45}
              step={1}
              value={settings.maxPct}
              onChange={(value) => patchSettings({ maxPct: value })}
            />
            <RangeField
              id="minr"
              label="Ukuran terkecil"
              display={`${Math.round(settings.minRatio * 100)}% dari terbesar`}
              min={10}
              max={50}
              step={2}
              value={Math.round(settings.minRatio * 100)}
              onChange={(value) => patchSettings({ minRatio: value / 100 })}
            />
            <RangeField
              id="kval"
              label="Kecepatan mengecil (k)"
              display={String(settings.k)}
              min={3}
              max={24}
              step={1}
              value={settings.k}
              hint="Kecil = cepat mengecil. Besar = banyak kata tetap besar."
              onChange={(value) => patchSettings({ k: value })}
            />
            <RangeField
              id="safe"
              label="Area aman"
              display={`${settings.safePct}% dari tepi`}
              min={0}
              max={12}
              step={1}
              value={settings.safePct}
              hint="Kalibrasi saat gladi supaya kata tidak terpotong tepi kain."
              onChange={(value) => patchSettings({ safePct: value })}
            />
            <NumberField
              id="maxw"
              label="Maks kata tampil"
              value={settings.maxWords}
              min={10}
              max={1000}
              onCommit={(value) => patchSettings({ maxWords: value }, true)}
            />
            <div className="flex flex-col gap-2">
              <span className="text-sm font-bold">Gaya huruf</span>
              <div role="group" aria-label="Gaya huruf" className="flex rounded-xl bg-surface2 p-1">
                {caseStyles.map((style) => {
                  const active = settings.caseStyle === style;
                  return (
                    <button
                      key={style}
                      type="button"
                      aria-pressed={active}
                      onClick={() => patchSettings({ caseStyle: style }, true)}
                      className={`h-9 flex-1 rounded-[9px] border-0 text-sm font-extrabold ${
                        active ? "bg-primary text-on-primary" : "bg-transparent text-fg"
                      }`}
                    >
                      {caseLabels[style]}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 rounded-xl bg-surface2 px-4 py-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-bold">Siluet bentuk</span>
              <span className="text-[13px] text-muted">Wordcloud mengisi bentuk dari gambar mask hitam-putih.</span>
            </div>
            <span className="flex h-7 shrink-0 items-center rounded-full border border-line px-2.5 text-xs font-bold text-muted">
              Fase akhir
            </span>
          </div>
        </SettingsCard>

        <SettingsCard title="Halaman input">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold">Tema</span>
            <div className="flex flex-wrap gap-2.5">
              {inputThemes.map((theme) => {
                const swatch = inputSwatches[theme];
                const selected = settings.inputTheme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickInputTheme(theme)}
                    className={`${themeCardClass(selected)} flex-[1_1_120px]`}
                  >
                    <span
                      className="relative flex h-14 flex-col overflow-hidden rounded-[9px] border border-line"
                      style={{ background: swatch.background }}
                    >
                      {theme === "reggae" ? (
                        <>
                          <span className="grow bg-[#D62F2F]" />
                          <span className="grow bg-[#F5C02E]" />
                          <span className="grow bg-[#17924A]" />
                        </>
                      ) : null}
                      {theme === "foto" && inputFoto ? (
                        <img src={inputFoto} alt="" className="absolute inset-0 h-full w-full object-cover" />
                      ) : null}
                      <span
                        className="absolute inset-x-3 top-1/2 h-5 -translate-y-1/2 rounded-md border-2"
                        style={{ background: swatch.field, borderColor: swatch.fieldBorder }}
                      />
                    </span>
                    <span className="px-1 pb-0.5 text-sm font-extrabold">{swatch.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold">Gambar latar input (tema Foto)</span>
            <BackgroundPicker
              ids={inputIds}
              selectedId={settings.inputBgId}
              size="md"
              ariaSubject="input"
              uploadLabel="Upload foto latar input"
              uploading={uploading === "input_bg"}
              error={inputBgError}
              onSelectId={(id) => {
                setInputBgError(null);
                patchSettings({ inputBgId: id }, true);
              }}
              onPickFile={(file) => upload("input_bg", file)}
            />
          </div>

          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-[999_1_280px] flex-col gap-2">
              <label htmlFor="ajakan-adm" className="text-sm font-bold">
                Kalimat ajakan
              </label>
              <input
                ref={promptRef}
                id="ajakan-adm"
                type="text"
                maxLength={80}
                value={promptDraft}
                onChange={(event) => {
                  setPromptDraft(event.target.value);
                  if (event.target.value.trim()) patchSettings({ prompt: event.target.value });
                }}
                onBlur={() => setPromptDraft(settings.prompt)}
                autoComplete="off"
                className="box-border h-12 rounded-[10px] border border-line bg-field px-3.5 text-base text-fg focus:border-ring focus:outline-none"
              />
            </div>
            <div className="min-w-0 flex-[1_1_120px]">
              <NumberField
                id="maks-adm"
                label="Maks karakter"
                value={settings.maxChars}
                min={3}
                max={40}
                onCommit={(value) => patchSettings({ maxChars: value }, true)}
              />
            </div>
          </div>

          <SwitchField
            id="blur-label"
            label="Card blur di belakang teks"
            description="Posisi dan ukuran elemen tetap sama saat nyala atau mati."
            checked={settings.cardBlur}
            onChange={(checked) => patchSettings({ cardBlur: checked }, true)}
          />
        </SettingsCard>
      </div>

      <aside className="flex min-w-0 flex-[1_1_500px] flex-col gap-5">
        <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-[18px]">
          <div className="flex items-center justify-between">
            <span className="text-[17px] font-extrabold">Preview photowall</span>
            <SaveIndicator />
          </div>
          <PhotowallPreview entries={preview} settings={settings} animate={false} />
          <span className="text-[13px] text-muted">Mesin layout yang sama dengan layar di venue.</span>
        </section>
        <section className="flex flex-col gap-3 rounded-[18px] border border-line bg-surface p-[18px]">
          <span className="text-[17px] font-extrabold">Preview input</span>
          <InputPreview settings={settings} />
        </section>
      </aside>
    </main>
  );
}
