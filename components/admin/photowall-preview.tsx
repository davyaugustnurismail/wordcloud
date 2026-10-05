"use client";

import type { StageEntry, StageSettings } from "../wordcloud-stage";
import { WordcloudStage } from "../wordcloud-stage";

type Props = {
  entries: readonly StageEntry[];
  settings: StageSettings;
  backgroundUrl?: string | null;
  animate?: boolean;
  compact?: boolean;
};

export function PhotowallPreview({ entries, settings, backgroundUrl, animate = true, compact = false }: Props) {
  return (
    <div
      className={`aspect-video w-full overflow-hidden rounded-xl border border-line ${compact ? "max-w-[300px]" : "max-w-[480px]"}`}
    >
      <WordcloudStage
        entries={entries}
        settings={settings}
        backgroundUrl={backgroundUrl}
        animate={animate}
        className="h-full w-full"
      />
    </div>
  );
}
