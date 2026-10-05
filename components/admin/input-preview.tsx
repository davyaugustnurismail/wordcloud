"use client";

import { inputThemeTokens } from "@/lib/input-themes";
import { assetUrl, type SessionSettings } from "@/lib/settings";

export function InputPreview({ settings }: { settings: SessionSettings }) {
  const theme = inputThemeTokens[settings.inputTheme];
  const blurOn = settings.cardBlur;

  return (
    <div
      className="relative h-[300px] w-full max-w-[480px] overflow-hidden rounded-xl border border-line"
      style={{ background: theme.background }}
    >
      {theme.usesImage ? (
        <>
          {settings.inputBgId ? (
            <img src={assetUrl(settings.inputBgId)} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : null}
          <div className="absolute inset-0 bg-black/55" />
        </>
      ) : null}
      <div
        className="absolute left-1/2 top-1/2 flex w-[79%] -translate-x-1/2 -translate-y-1/2 flex-col gap-3 rounded-[18px] border px-[22px] py-5"
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
          className="block h-[46px] rounded-[10px] border-[3px]"
          style={{ background: theme.field.background, borderColor: theme.field.border }}
        />
        <span
          className="flex h-10 items-center justify-center rounded-[10px] font-display text-xl font-extrabold"
          style={{ background: theme.button.background, color: theme.button.color }}
        >
          Kirim
        </span>
      </div>
    </div>
  );
}
