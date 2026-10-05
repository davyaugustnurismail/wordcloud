"use client";

import type { StageEntry, StageSettings } from "../wordcloud-stage";
import { WordcloudStage } from "../wordcloud-stage";

type Props = {
  entries: readonly StageEntry[];
  settings: StageSettings;
  animate?: boolean;
};

export function PhotowallPreview({ entries, settings, animate = true }: Props) {
  return (
    <div className="aspect-video w-full max-w-[480px] overflow-hidden rounded-xl border border-line">
      <WordcloudStage entries={entries} settings={settings} animate={animate} className="h-full w-full" />
    </div>
  );
}
