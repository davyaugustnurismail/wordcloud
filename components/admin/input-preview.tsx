"use client";

import { resolveInputTheme } from "@/lib/input-themes";
import { assetUrl, type SessionSettings } from "@/lib/settings";

type Props = {
  settings: SessionSettings;
  backgroundUrl?: string | null;
  scale?: number;
};

const BASE_WIDTH = 480;
const BASE_HEIGHT = 330;

export function InputPreview({ settings, backgroundUrl, scale }: Props) {
  const theme = resolveInputTheme(settings);
  const blurOn = settings.cardBlur;
  const imageUrl = backgroundUrl ?? (settings.inputBgId ? assetUrl(settings.inputBgId) : null);

  const body = (
    <div
      className="relative h-full w-full overflow-hidden rounded-xl border border-line"
      style={{ background: theme.background }}
    >
      {theme.usesImage ? (
        <>
          {imageUrl ? <img src={imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" /> : null}
          <div className="absolute inset-0" style={{ background: `rgba(0, 0, 0, ${settings.inputOverlay / 100})` }} />
        </>
      ) : null}
      <div
        className="absolute right-3 top-2.5 flex items-center gap-1.5 text-[11px] font-semibold"
        style={{ color: theme.status.text }}
      >
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: theme.status.dot }} />
        Terhubung
      </div>
      <div
        className="absolute left-1/2 top-1/2 flex w-[79%] -translate-x-1/2 -translate-y-1/2 flex-col gap-2.5 rounded-[18px] border px-[22px] py-5"
        style={{
          background: blurOn ? theme.card.background : "transparent",
          borderColor: blurOn ? theme.card.border : "transparent",
          backdropFilter: blurOn ? "blur(14px)" : "none",
          WebkitBackdropFilter: blurOn ? "blur(14px)" : "none",
        }}
      >
        <span
          className="text-center font-display text-[26px] font-extrabold leading-[1.05]"
          style={{ color: theme.text }}
        >
          {settings.prompt}
        </span>
        <span
          className="box-border flex h-[46px] items-center justify-center font-display text-[22px] font-extrabold"
          style={{
            background: theme.field.background,
            borderColor: theme.field.border,
            borderWidth: theme.box.previewBorderWidth,
            borderRadius: theme.box.previewFieldRadius,
            boxShadow: theme.fieldShadow ?? undefined,
            color: theme.field.text,
          }}
        >
          bahagia
        </span>
        <span className="flex items-center justify-between text-[11px] font-bold" style={{ color: theme.helper }}>
          <span>Cukup satu kata, tanpa spasi.</span>
          <span>7/{settings.maxChars}</span>
        </span>
        <span
          className="flex h-10 items-center justify-center font-display text-xl font-extrabold"
          style={{
            background: theme.button.background,
            color: theme.button.color,
            borderRadius: theme.box.previewButtonRadius,
            boxShadow: theme.buttonShadow ?? undefined,
          }}
        >
          Kirim
        </span>
      </div>
    </div>
  );

  if (scale === undefined) {
    return <div className="h-[330px] w-full max-w-[480px]">{body}</div>;
  }

  return (
    <div style={{ width: BASE_WIDTH * scale, height: BASE_HEIGHT * scale }}>
      <div style={{ width: BASE_WIDTH, height: BASE_HEIGHT, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        {body}
      </div>
    </div>
  );
}
