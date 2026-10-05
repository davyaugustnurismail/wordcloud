"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { demoEntries } from "@/lib/demo-words";
import { checkImageFile } from "@/lib/image-file";
import { readableOn } from "@/lib/color";
import { baseTokensFor, inputBoxSpecs } from "@/lib/input-themes";
import {
  assetUrl,
  DEFAULT_INPUT_COLOR,
  DEFAULT_PHOTOWALL_COLOR,
  DEFAULT_PROMPT,
  defaultSettings,
  type InputBoxStyle,
  type InputTheme,
  type ModerationMode,
  type PhotowallTheme,
  type SessionDefaults,
  type SessionSettings,
} from "@/lib/settings";
import { paletteFor, photowallBackground } from "@/lib/wordcloud/palette";
import { InputPreview } from "./admin/input-preview";
import { PhotowallPreview } from "./admin/photowall-preview";
import { RangeField } from "./admin/settings-fields";
import { BackgroundPicker } from "./background-picker";
import { AlertCircleIcon, ArrowRightIcon, CheckIcon, ChevronLeftIcon, LockIcon, SpinnerIcon } from "./icons";
import { BoxStyleField, ColorField, PaletteField } from "./theme-controls";

type Library = { photowall: string[]; input: string[] };

type Background = { type: "library"; id: string } | { type: "file"; file: File; url: string } | null;

type InputColors = {
  text: string | null;
  field: string | null;
  fieldText: string | null;
  border: string | null;
  button: string | null;
};

const NO_INPUT_COLORS: InputColors = { text: null, field: null, fieldText: null, border: null, button: null };

const photowallThemeOptions: { id: PhotowallTheme; label: string }[] = [
  { id: "hitam", label: "Hitam" },
  { id: "putih", label: "Putih" },
  { id: "foto", label: "Foto" },
  { id: "warna", label: "Warna" },
];

const inputThemeOptions: { id: InputTheme; label: string }[] = [
  { id: "reggae", label: "Reggae" },
  { id: "hitam", label: "Hitam" },
  { id: "putih", label: "Putih" },
  { id: "foto", label: "Foto" },
  { id: "warna", label: "Warna" },
];

const photowallSwatchWords: Record<Exclude<PhotowallTheme, "warna">, [string, string, string]> = {
  hitam: ["#FFE14D", "#3DE0FF", "#FF4FAE"],
  putih: ["#0B2E8A", "#B0125B", "#0A6B4C"],
  foto: ["#FFFFFF", "#FFE14D", "#8BE9FF"],
};

const inputSwatches: Record<Exclude<InputTheme, "warna">, { background: string; field: string; fieldBorder: string }> = {
  reggae: { background: "#0C0C0C", field: "#FFFFFF", fieldBorder: "#0C0C0C" },
  hitam: { background: "#000000", field: "#141416", fieldBorder: "#FFE14D" },
  putih: { background: "#FFFFFF", field: "#F6F5F1", fieldBorder: "#141416" },
  foto: { background: "#000000", field: "#FFFFFF", fieldBorder: "#FFFFFF" },
};

const moderationOptions: { id: ModerationMode; label: string; description: string }[] = [
  {
    id: "langsung",
    label: "Langsung (default)",
    description: "Kata tampil di photowall begitu dikirim. Admin tetap bisa menyembunyikan.",
  },
  {
    id: "approve",
    label: "Approve",
    description: "Kata menunggu di admin sampai disetujui, baru naik ke tengah.",
  },
];

const fieldClass =
  "box-border h-[52px] w-full min-w-0 rounded-xl border border-line bg-field px-4 text-[17px] font-semibold text-fg focus:border-ring focus:outline-none";
const sectionClass = "flex flex-col gap-4 rounded-[20px] border border-line bg-surface p-7";
const previewDockClass =
  "z-10 flex flex-col gap-2 border-y border-line bg-surface py-3 md:sticky md:top-3 md:shadow-[0_-12px_0_0_var(--surface)]";

function optionClass(selected: boolean) {
  return `flex min-w-0 flex-col gap-2.5 rounded-2xl border-2 p-2.5 text-left ${
    selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
  }`;
}

function SectionHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-lg font-extrabold">{title}</h2>
      <p className="m-0 text-sm text-muted">{description}</p>
    </div>
  );
}

function OptionFooter({ label, selected }: { label: string; selected: boolean }) {
  return (
    <span className="flex items-center justify-between px-1 pb-0.5">
      <span className="text-[15px] font-extrabold">{label}</span>
      {selected ? <CheckIcon size={18} strokeWidth={2.6} /> : null}
    </span>
  );
}

function errorMessage(status: number): string {
  if (status === 401) return "Password pembuat sesi salah.";
  if (status === 413) return "Gambar terlalu besar. Maksimal 10 MB.";
  if (status === 429) return "Terlalu banyak percobaan. Coba lagi sebentar.";
  if (status === 400) return "Periksa kembali isian form dan gambar latar.";
  return "Sesi gagal dibuat. Coba lagi.";
}

function backgroundUrl(background: Background): string | null {
  if (!background) return null;
  return background.type === "library" ? assetUrl(background.id) : background.url;
}

export function CreateForm({ library, defaults }: { library: Library; defaults: SessionDefaults }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [moderation, setModeration] = useState<ModerationMode>(defaults.moderationMode);
  const [photowallTheme, setPhotowallTheme] = useState<PhotowallTheme>(defaults.photowallTheme);
  const [inputTheme, setInputTheme] = useState<InputTheme>(defaults.inputTheme);
  const [photowallBg, setPhotowallBg] = useState<Background>(
    library.photowall[0] ? { type: "library", id: library.photowall[0] } : null,
  );
  const [inputBg, setInputBg] = useState<Background>(
    library.input[0] ? { type: "library", id: library.input[0] } : null,
  );
  const [photowallBgError, setPhotowallBgError] = useState<string | null>(null);
  const [inputBgError, setInputBgError] = useState<string | null>(null);
  const [photowallColor, setPhotowallColor] = useState(DEFAULT_PHOTOWALL_COLOR);
  const [inputColor, setInputColor] = useState(DEFAULT_INPUT_COLOR);
  const [photowallOverlay, setPhotowallOverlay] = useState(45);
  const [inputOverlay, setInputOverlay] = useState(55);
  const [palette, setPalette] = useState<string[] | null>(null);
  const [boxStyle, setBoxStyle] = useState<InputBoxStyle>("membulat");
  const [inputColors, setInputColors] = useState<InputColors>(NO_INPUT_COLORS);
  const [prompt, setPrompt] = useState(DEFAULT_PROMPT);
  const [maxChars, setMaxChars] = useState(String(defaults.maxChars));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrls = useRef<string[]>([]);

  useEffect(() => {
    const urls = objectUrls.current;
    return () => {
      for (const url of urls) URL.revokeObjectURL(url);
    };
  }, []);

  const pickFile = (
    file: File,
    setBackground: (background: Background) => void,
    setBackgroundError: (message: string | null) => void,
  ) => {
    const problem = checkImageFile(file);
    setBackgroundError(problem);
    if (problem) return;
    const url = URL.createObjectURL(file);
    objectUrls.current.push(url);
    setBackground({ type: "file", file, url });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;

    if ((photowallTheme === "foto" && !photowallBg) || (inputTheme === "foto" && !inputBg)) {
      setError("Pilih atau upload gambar latar untuk tema Foto.");
      return;
    }

    setSubmitting(true);
    setError(null);

    const body = new FormData();
    body.set("name", name);
    body.set("password", password);
    body.set("moderationMode", moderation);
    body.set("photowallTheme", photowallTheme);
    body.set("inputTheme", inputTheme);
    body.set("prompt", prompt);
    body.set("maxChars", maxChars);
    body.set("photowallColor", photowallColor);
    body.set("inputColor", inputColor);
    body.set("photowallOverlay", String(photowallOverlay));
    body.set("inputOverlay", String(inputOverlay));
    body.set("inputBoxStyle", boxStyle);
    if (palette) body.set("palette", JSON.stringify(palette));
    if (inputColors.text) body.set("inputTextColor", inputColors.text);
    if (inputColors.field) body.set("inputFieldColor", inputColors.field);
    if (inputColors.fieldText) body.set("inputFieldTextColor", inputColors.fieldText);
    if (inputColors.border) body.set("inputBorderColor", inputColors.border);
    if (inputColors.button) body.set("inputButtonColor", inputColors.button);
    if (photowallBg?.type === "file") body.set("photowallImage", photowallBg.file);
    else if (photowallBg) body.set("photowallBgId", photowallBg.id);
    if (inputBg?.type === "file") body.set("inputImage", inputBg.file);
    else if (inputBg) body.set("inputBgId", inputBg.id);

    try {
      const response = await fetch("/api/sessions", { method: "POST", body });
      if (!response.ok) {
        setError(errorMessage(response.status));
        setSubmitting(false);
        return;
      }
      const { code } = (await response.json()) as { code: string };
      router.push(`/s/${code}/ready`);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      setSubmitting(false);
    }
  };

  const photowallPreviewUrl = backgroundUrl(photowallBg);
  const inputPreviewUrl = backgroundUrl(inputBg);
  const previewEntries = useMemo(() => demoEntries(90, "bahagia", 7), []);
  const baseInput = baseTokensFor({ inputTheme, inputColor });
  const boxSpec = inputBoxSpecs[boxStyle];

  const previewSettings = useMemo<SessionSettings>(() => {
    const limit = Number(maxChars);
    return {
      ...defaultSettings(),
      photowallTheme,
      inputTheme,
      photowallColor,
      inputColor,
      photowallOverlay,
      inputOverlay,
      palette,
      inputBoxStyle: boxStyle,
      inputTextColor: inputColors.text,
      inputFieldColor: inputColors.field,
      inputFieldTextColor: inputColors.fieldText,
      inputBorderColor: inputColors.border,
      inputButtonColor: inputColors.button,
      prompt: prompt.trim() || DEFAULT_PROMPT,
      maxChars: Number.isInteger(limit) && limit >= 3 && limit <= 40 ? limit : 20,
      cardBlur: inputTheme === "foto",
    };
  }, [
    photowallTheme,
    inputTheme,
    photowallColor,
    inputColor,
    photowallOverlay,
    inputOverlay,
    palette,
    boxStyle,
    inputColors,
    prompt,
    maxChars,
  ]);

  const setInputColorField = (key: keyof InputColors, value: string | null) =>
    setInputColors((current) => ({ ...current, [key]: value }));
  const hasInputColors = Object.values(inputColors).some(Boolean);
  const wallWords = paletteFor("warna", palette, photowallColor);

  return (
    <main className="flex flex-1 justify-center px-6 pb-16 pt-10">
      <form onSubmit={submit} className="m-0 flex w-full max-w-[760px] flex-col gap-7">
        <div className="flex flex-col gap-2">
          <Link href="/" className="flex items-center gap-1.5 self-start text-sm font-semibold text-muted">
            <ChevronLeftIcon size={16} />
            Kembali
          </Link>
          <h1 className="m-0 text-4xl font-extrabold tracking-[-0.02em]">Buat sesi baru</h1>
          <p className="m-0 text-base leading-[1.55] text-muted">
            Layar ini akan jadi photowall. Semua pengaturan bisa diubah lagi dari admin sesi.
          </p>
        </div>

        <section className={`${sectionClass} gap-5`}>
          <div className="flex flex-wrap gap-5">
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
              <label htmlFor="nama-sesi" className="text-sm font-bold">
                Nama sesi
              </label>
              <input
                id="nama-sesi"
                type="text"
                required
                maxLength={60}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Nama sesi"
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <div className="flex min-w-0 flex-[1_1_280px] flex-col gap-2">
              <label htmlFor="pw-pembuat" className="text-sm font-bold">
                Password pembuat sesi
              </label>
              <input
                id="pw-pembuat"
                type="password"
                required
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                aria-describedby="pw-bantu"
                autoComplete="off"
                className={fieldClass}
              />
              <span id="pw-bantu" className="text-[13px] text-muted">
                Diatur oleh admin global.
              </span>
            </div>
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeading title="Mode moderasi" description="Bisa diganti kapan saja di tengah acara." />
          <div className="flex flex-wrap gap-3">
            {moderationOptions.map((option) => {
              const selected = option.id === moderation;
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setModeration(option.id)}
                  className={`flex min-w-0 flex-[1_1_260px] items-start gap-3.5 rounded-[14px] border-2 p-[18px] text-left ${
                    selected ? "border-primary bg-sel-bg" : "border-line bg-transparent"
                  }`}
                >
                  <span
                    className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-primary" : "border-muted"
                    }`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${selected ? "bg-primary" : "bg-transparent"}`} />
                  </span>
                  <span className="flex flex-col gap-1">
                    <span className="text-base font-extrabold">{option.label}</span>
                    <span className="text-sm leading-[1.45] text-muted">{option.description}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeading
            title="Tema photowall"
            description="Hitam paling cocok untuk infocus: area hitam tidak memancarkan cahaya, jadi kata terlihat melayang."
          />
          <div className="flex flex-wrap gap-3">
            {photowallThemeOptions.map((option) => {
              const selected = option.id === photowallTheme;
              const words =
                option.id === "warna"
                  ? [wallWords[0] ?? "#FFFFFF", wallWords[1] ?? "#FFFFFF", wallWords[2] ?? "#FFFFFF"]
                  : photowallSwatchWords[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setPhotowallTheme(option.id)}
                  className={`${optionClass(selected)} flex-[1_1_130px]`}
                >
                  <span
                    className="relative block h-24 overflow-hidden rounded-[10px] border border-line"
                    style={{ background: photowallBackground(option.id, photowallColor) }}
                  >
                    {option.id === "foto" && photowallPreviewUrl ? (
                      <img src={photowallPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover opacity-75" />
                    ) : null}
                    <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1 font-display font-extrabold leading-none">
                      <span className="text-[30px]" style={{ color: words[0] }}>
                        seru
                      </span>
                      <span className="flex gap-1.5 text-sm">
                        <span style={{ color: words[1] }}>irie</span>
                        <span style={{ color: words[2] }}>damai</span>
                      </span>
                    </span>
                  </span>
                  <OptionFooter label={option.label} selected={selected} />
                </button>
              );
            })}
          </div>

          <div className={previewDockClass}>
            <span className="text-[13px] font-bold text-muted">Preview photowall</span>
            <PhotowallPreview
              entries={previewEntries}
              settings={previewSettings}
              backgroundUrl={photowallPreviewUrl}
              animate={false}
              compact
            />
          </div>

          <div className="flex flex-col gap-2.5 sm:max-w-[360px]">
            <ColorField
              id="warna-photowall"
              label="Warna latar photowall"
              value={photowallColor}
              fallback={photowallColor}
              onChange={setPhotowallColor}
              hint="Dipakai saat tema Warna."
            />
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <span className="text-[15px] font-bold">Gambar latar photowall</span>
              <span className="text-[13px] text-muted">Dipakai saat tema Foto. JPG/PNG, dikompres ke lebar 1920 px.</span>
            </div>
            <BackgroundPicker
              ids={library.photowall}
              selectedId={photowallBg?.type === "library" ? photowallBg.id : null}
              localPreview={photowallBg?.type === "file" ? photowallBg.url : null}
              size="lg"
              ariaSubject="photowall"
              uploadLabel="Upload foto latar photowall"
              error={photowallBgError}
              onSelectId={(id) => {
                setPhotowallBgError(null);
                setPhotowallBg({ type: "library", id });
              }}
              onPickFile={(file) => pickFile(file, setPhotowallBg, setPhotowallBgError)}
            />
            <div className="sm:max-w-[360px]">
              <RangeField
                id="overlay-photowall"
                label="Overlay gelap"
                display={`${photowallOverlay}%`}
                min={0}
                max={85}
                step={5}
                value={photowallOverlay}
                onChange={setPhotowallOverlay}
              />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <PaletteField theme={photowallTheme} color={photowallColor} palette={palette} onChange={setPalette} />
          </div>
        </section>

        <section className={sectionClass}>
          <SectionHeading title="Halaman input" description="Tampilan di device tempat audiens mengetik kata." />
          <div className="flex flex-wrap gap-3">
            {inputThemeOptions.map((option) => {
              const selected = option.id === inputTheme;
              const swatch =
                option.id === "warna"
                  ? { background: inputColor, field: "#FFFFFF", fieldBorder: readableOn(inputColor) }
                  : inputSwatches[option.id];
              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setInputTheme(option.id)}
                  className={`${optionClass(selected)} flex-[1_1_110px]`}
                >
                  <span
                    className="relative flex h-[76px] flex-col overflow-hidden rounded-[10px] border border-line"
                    style={{ background: swatch.background }}
                  >
                    {option.id === "reggae" ? (
                      <>
                        <span className="grow bg-[#D62F2F]" />
                        <span className="grow bg-[#F5C02E]" />
                        <span className="grow bg-[#17924A]" />
                      </>
                    ) : null}
                    {option.id === "foto" && inputPreviewUrl ? (
                      <img src={inputPreviewUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
                    ) : null}
                    <span
                      className="absolute inset-x-3.5 top-1/2 h-[26px] -translate-y-1/2 rounded-[7px] border-2"
                      style={{ background: swatch.field, borderColor: swatch.fieldBorder }}
                    />
                  </span>
                  <OptionFooter label={option.label} selected={selected} />
                </button>
              );
            })}
          </div>

          <div className={previewDockClass}>
            <span className="text-[13px] font-bold text-muted">Preview halaman input</span>
            <InputPreview settings={previewSettings} backgroundUrl={inputPreviewUrl} scale={0.62} />
          </div>

          <div className="flex flex-col gap-2.5 sm:max-w-[360px]">
            <ColorField
              id="warna-input"
              label="Warna latar input"
              value={inputColor}
              fallback={inputColor}
              onChange={setInputColor}
              hint="Dipakai saat tema Warna."
            />
          </div>

          <div className="flex flex-col gap-2.5 border-t border-line pt-4">
            <div className="flex flex-wrap items-baseline justify-between gap-1.5">
              <span className="text-[15px] font-bold">Gambar latar input</span>
              <span className="text-[13px] text-muted">Dipakai saat tema Foto.</span>
            </div>
            <BackgroundPicker
              ids={library.input}
              selectedId={inputBg?.type === "library" ? inputBg.id : null}
              localPreview={inputBg?.type === "file" ? inputBg.url : null}
              size="lg"
              ariaSubject="input"
              uploadLabel="Upload foto latar input"
              error={inputBgError}
              onSelectId={(id) => {
                setInputBgError(null);
                setInputBg({ type: "library", id });
              }}
              onPickFile={(file) => pickFile(file, setInputBg, setInputBgError)}
            />
            <div className="sm:max-w-[360px]">
              <RangeField
                id="overlay-input"
                label="Overlay gelap input"
                display={`${inputOverlay}%`}
                min={0}
                max={85}
                step={5}
                value={inputOverlay}
                onChange={setInputOverlay}
              />
            </div>
          </div>

          <div className="border-t border-line pt-4">
            <BoxStyleField
              value={boxStyle}
              sample={{
                background: baseInput.background,
                field: inputColors.field ?? baseInput.field.background,
                border: inputColors.border ?? baseInput.field.border,
                text: inputColors.text ?? baseInput.text,
              }}
              onChange={setBoxStyle}
            />
          </div>

          <div className="flex flex-col gap-3.5 border-t border-line pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[15px] font-bold">Warna tulisan dan kotak</span>
              {hasInputColors ? (
                <button
                  type="button"
                  onClick={() => setInputColors(NO_INPUT_COLORS)}
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
                value={inputColors.text}
                fallback={baseInput.text}
                onChange={(hex) => setInputColorField("text", hex)}
                onReset={() => setInputColorField("text", null)}
              />
              {boxSpec.transparentField ? null : (
                <ColorField
                  id="warna-isi-kotak"
                  label="Isi kotak input"
                  value={inputColors.field}
                  fallback={baseInput.field.background}
                  onChange={(hex) => setInputColorField("field", hex)}
                  onReset={() => setInputColorField("field", null)}
                />
              )}
              <ColorField
                id="warna-tulisan-kotak"
                label="Tulisan di dalam kotak"
                value={inputColors.fieldText}
                fallback={baseInput.field.text}
                onChange={(hex) => setInputColorField("fieldText", hex)}
                onReset={() => setInputColorField("fieldText", null)}
              />
              <ColorField
                id="warna-garis-kotak"
                label="Garis kotak input"
                value={inputColors.border}
                fallback={baseInput.field.border}
                onChange={(hex) => setInputColorField("border", hex)}
                onReset={() => setInputColorField("border", null)}
              />
              <ColorField
                id="warna-tombol"
                label="Tombol Kirim"
                value={inputColors.button}
                fallback={baseInput.button.background}
                onChange={(hex) => setInputColorField("button", hex)}
                onReset={() => setInputColorField("button", null)}
              />
            </div>
            {boxSpec.transparentField ? (
              <span className="text-xs text-muted">Jenis kotak ini tanpa isi, jadi hanya garisnya yang berwarna.</span>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-5 border-t border-line pt-4">
            <div className="flex min-w-0 flex-[999_1_300px] flex-col gap-2">
              <label htmlFor="ajakan" className="text-sm font-bold">
                Kalimat ajakan
              </label>
              <input
                id="ajakan"
                type="text"
                required
                maxLength={80}
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
            </div>
            <div className="flex min-w-0 flex-[1_1_140px] flex-col gap-2">
              <label htmlFor="maks" className="text-sm font-bold">
                Maks karakter
              </label>
              <input
                id="maks"
                type="number"
                required
                min={3}
                max={40}
                value={maxChars}
                onChange={(event) => setMaxChars(event.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        <div className="flex items-start gap-3 rounded-[14px] bg-surface2 px-[18px] py-4 text-sm leading-normal text-fg">
          <LockIcon size={20} className="mt-px shrink-0" />
          <span>Kode sesi 6 karakter dan PIN admin 6 digit dibuat otomatis, lalu ditampilkan di halaman berikutnya.</span>
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-center gap-2 rounded-[14px] bg-surface2 px-[18px] py-3.5 text-sm font-bold text-danger"
          >
            <AlertCircleIcon size={18} />
            {error}
          </div>
        ) : null}

        <div className="flex flex-wrap justify-end gap-3">
          <Link
            href="/"
            className="flex h-14 items-center justify-center rounded-[14px] border border-line px-6 text-base font-bold text-fg"
          >
            Batal
          </Link>
          <button
            type="submit"
            disabled={submitting}
            className="flex h-14 items-center justify-center gap-2.5 rounded-[14px] bg-primary px-7 text-base font-extrabold text-on-primary disabled:opacity-60"
          >
            {submitting ? "Membuat sesi…" : "Buat sesi"}
            {submitting ? <SpinnerIcon size={20} /> : <ArrowRightIcon size={20} strokeWidth={2.2} />}
          </button>
        </div>
      </form>
    </main>
  );
}
