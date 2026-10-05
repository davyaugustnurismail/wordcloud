import { computeLayout, type LayoutParams, type LayoutWord } from "./layout";

type LayoutRequest = {
  seq: number;
  words: LayoutWord[];
  params: LayoutParams;
  hint: number | undefined;
};

self.addEventListener("message", (event: MessageEvent<LayoutRequest>) => {
  const { seq, words, params, hint } = event.data;
  const startedAt = performance.now();
  const result = computeLayout(words, params, hint);
  self.postMessage({ seq, result, ms: performance.now() - startedAt });
});
