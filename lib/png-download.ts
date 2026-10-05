import type { SessionSettings } from "./settings";
import { downloadBlob } from "./download";
import { renderWordcloudPng } from "./wordcloud/render-png";

type WordsResponse = {
  settings: SessionSettings;
  entries: { id: string; text: string }[];
};

export async function downloadSessionPng(code: string): Promise<void> {
  const response = await fetch(`/api/sessions/${code}/words`, { cache: "no-store" });
  if (!response.ok) throw new Error("Kata sesi tidak bisa dimuat");
  const data = (await response.json()) as WordsResponse;
  downloadBlob(await renderWordcloudPng(data.entries, data.settings), `wordcloud-${code}.png`);
}
