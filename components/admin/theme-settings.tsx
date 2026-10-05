"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { overBlack, readableOn } from "@/lib/color";
import { demoEntries } from "@/lib/demo-words";
import { checkImageFile } from "@/lib/image-file";
import { baseTokensFor, inputBoxSpecs } from "@/lib/input-themes";
import { uploadSessionImage, type UploadKind } from "@/lib/upload-client";
import {
  assetUrl,
  caseStyles,
  inputThemes,
  photowallFonts,
  photowallThemes,
  type CaseStyle,
  type InputTheme,
  type PhotowallFont,
  type PhotowallTheme,
  type SessionSettings,
} from "@/lib/settings";
import { fontSpecs } from "@/lib/wordcloud/fonts";
import { paletteFor, stageBackground } from "@/lib/wordcloud/palette";
import { BackgroundPicker } from "../background-picker";
import { CheckIcon } from "../icons";
import { BoxStyleField, ColorField, PaletteField } from "../theme-controls";
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

const photowallLabels: Record<PhotowallTheme, string> = { hitam: "Hitam", putih: "Putih", foto: "Foto", warna: "Warna" };
const inputLabels: Record<InputTheme, string> = {
  reggae: "Reggae",
  hitam: "Hitam",
  putih: "Putih",
  foto: "Foto",
  warna: "Warna",
};

const photowallSwatchWord: Record<Exclude<PhotowallTheme, "warna">, string> = {
  hitam: "#FFE14D",
  putih: "#0B2E8A",
  foto: "#FFFFFF",
};

const inputSwatches: Record<
  Exclude<InputTheme, "warna">,
  { background: string; field: string; fieldBorder: string }
> = {
  reggae: { background: "#0C0C0C", field: "#FFFFFF", fieldBorder: "#0C0C0C" },
  hitam: { background: "#000000", field: "#141416", fieldBorder: "#FFE14D" },
  putih: { background: "#FFFFFF", field: "#F6F5F1", fieldBorder: "#141416" },
  foto: { background: "#000000", field: "#FFFFFF", fieldBorder: "#FFFFFF" },
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

function hasInputColorOverride(settings: SessionSettings): boolean {
  return Boolean(
    settings.inputTextColor ||
      settings.inputFieldColor ||
      settings.inputFieldTextColor ||
      settings.inputBorderColor ||
      settings.inputButtonColor,
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
  const baseInput = baseTokensFor(settings);
  const boxSpec = inputBoxSpecs[settings.inputBoxStyle];

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
  const wallColorWord = paletteFor("warna", settings.palette, settings.photowallColor)[0] ?? "#FFFFFF";

  return (
    <main className="flex flex-1 flex-wrap items-start gap-6 px-4 py-4 md:px-8 md:pb-12 md:pt-6">
      <div className="flex min-w-0 flex-[999_1_600px] flex-col gap-5">
        <SettingsCard title="Photowall" note="Terkirim realtime ke layar">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold">Tema</span>
            <div className="flex flex-wrap gap-2.5">
              {photowallThemes.map((theme) => {
                const selected = settings.photowallTheme === theme;
                const background = stageBackground(theme, settings.photowallColor);
                const word = theme === "warna" ? wallColorWord : photowallSwatchWord[theme];
                return (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickPhotowallTheme(theme)}
                    className={`${themeCardClass(selected)} flex-[1_1_130px]`}
                  >
                    <span
                      className="relative block h-[70px] overflow-hidden rounded-[9px] border border-line"
                      style={{ background }}
                    >
                      {theme === "foto" && photowallFoto ? (
                        <img src={photowallFoto} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
                      ) : null}
                      <span
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-display text-[26px] font-extrabold leading-none"
                        style={{ color: word }}
                      >
                        seru
                      </span>
                    </span>
                    <span className="px-1 pb-0.5 text-sm font-extrabold">{photowallLabels[theme]}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[13px] leading-normal text-muted">
              Hitam paling cocok untuk infocus. Putih, Foto, dan Warna terang menyinari badan orang yang berfoto.
            </span>
          </div>

          <div className="flex flex-wrap gap-5">
            <div className="min-w-0 flex-[1_1_280px]">
              <ColorField
                id="warna-photowall"
                label="Warna latar photowall (tema Warna)"
                value={settings.photowallColor}
                fallback={settings.photowallColor}
                onChange={(hex) => patchSettings({ photowallColor: hex })}
              />
            </div>
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
            <div className="min-w-0 flex-[1_1_320px]">
              <PaletteField
                theme={settings.photowallTheme}
                color={settings.photowallColor}
                palette={settings.palette}
                transparency={settings.wordTransparency}
                onChange={(next) => patchSettings({ palette: next }, true)}
                onTransparencyChange={(next) => patchSettings({ wordTransparency: next })}
              />
            </div>
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
        </SettingsCard>

        <SettingsCard title="Halaman input">
          <div className="flex flex-col gap-2.5">
            <span className="text-sm font-bold">Tema</span>
            <div className="flex flex-wrap gap-2.5">
              {inputThemes.map((theme) => {
                const swatch =
                  theme === "warna"
                    ? {
                        background: overBlack(settings.inputColor),
                        field: "#FFFFFF",
                        fieldBorder: readableOn(settings.inputColor),
                      }
                    : inputSwatches[theme];
                const selected = settings.inputTheme === theme;
                return (
                  <button
                    key={theme}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => pickInputTheme(theme)}
                    className={`${themeCardClass(selected)} flex-[1_1_110px]`}
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
                    <span className="px-1 pb-0.5 text-sm font-extrabold">{inputLabels[theme]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="min-w-0 sm:max-w-[360px]">
            <ColorField
              id="warna-input"
              label="Warna latar input (tema Warna)"
              value={settings.inputColor}
              fallback={settings.inputColor}
              onChange={(hex) => patchSettings({ inputColor: hex })}
            />
          </div>

          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2.5">
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
            <div className="min-w-0 flex-[1_1_220px]">
              <RangeField
                id="overlay-input"
                label="Overlay gelap input"
                display={`${settings.inputOverlay}%`}
                min={0}
                max={85}
                step={5}
                value={settings.inputOverlay}
                onChange={(value) => patchSettings({ inputOverlay: value })}
              />
            </div>
          </div>

          <BoxStyleField
            value={settings.inputBoxStyle}
            sample={{
              background: baseInput.background,
              field: settings.inputFieldColor ?? baseInput.field.background,
              border: settings.inputBorderColor ?? baseInput.field.border,
              text: settings.inputTextColor ?? baseInput.text,
            }}
            onChange={(style) => patchSettings({ inputBoxStyle: style }, true)}
          />

          <div className="flex flex-col gap-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm font-bold">Warna tulisan dan kotak</span>
              {hasInputColorOverride(settings) ? (
                <button
                  type="button"
                  onClick={() =>
                    patchSettings(
                      {
                        inputTextColor: null,
                        inputFieldColor: null,
                        inputFieldTextColor: null,
                        inputBorderColor: null,
                        inputButtonColor: null,
                      },
                      true,
                    )
                  }
                  className="h-8 rounded-lg border border-line bg-transparent px-3 text-[13px] font-bold text-muted"
                >
                  Reset semua ke otomatis
                </button>
              ) : null}
            </div>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(240px,1fr))] gap-x-6 gap-y-4">
              <ColorField
                id="warna-teks-input"
                label="Judul dan teks bantuan"
                value={settings.inputTextColor}
                fallback={baseInput.text}
                onChange={(hex) => patchSettings({ inputTextColor: hex })}
                onReset={() => patchSettings({ inputTextColor: null }, true)}
              />
              {boxSpec.transparentField ? null : (
                <ColorField
                  id="warna-isi-kotak"
                  label="Isi kotak input"
                  value={settings.inputFieldColor}
                  fallback={baseInput.field.background}
                  onChange={(hex) => patchSettings({ inputFieldColor: hex })}
                  onReset={() => patchSettings({ inputFieldColor: null }, true)}
                />
              )}
              <ColorField
                id="warna-tulisan-kotak"
                label="Tulisan di dalam kotak"
                value={settings.inputFieldTextColor}
                fallback={baseInput.field.text}
                onChange={(hex) => patchSettings({ inputFieldTextColor: hex })}
                onReset={() => patchSettings({ inputFieldTextColor: null }, true)}
              />
              <ColorField
                id="warna-garis-kotak"
                label="Garis kotak input"
                value={settings.inputBorderColor}
                fallback={baseInput.field.border}
                onChange={(hex) => patchSettings({ inputBorderColor: hex })}
                onReset={() => patchSettings({ inputBorderColor: null }, true)}
              />
              <ColorField
                id="warna-tombol"
                label="Tombol Kirim"
                value={settings.inputButtonColor}
                fallback={baseInput.button.background}
                onChange={(hex) => patchSettings({ inputButtonColor: hex })}
                onReset={() => patchSettings({ inputButtonColor: null }, true)}
              />
            </div>
            {boxSpec.transparentField ? (
              <span className="text-xs text-muted">Jenis kotak ini tanpa isi, jadi hanya garisnya yang berwarna.</span>
            ) : null}
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

      <aside className="flex min-w-0 flex-[1_1_500px] flex-col gap-5 lg:sticky lg:top-4 lg:max-h-[calc(100dvh/var(--zoom,1)-2rem)] lg:overflow-y-auto">
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
