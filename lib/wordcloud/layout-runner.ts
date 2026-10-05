import { computeLayout, type LayoutParams, type LayoutResult, type LayoutWord } from "./layout";

export type LayoutJob = {
  words: LayoutWord[];
  params: LayoutParams;
  hint: number | undefined;
};

export type LayoutRunner = {
  run: (job: LayoutJob) => Promise<LayoutResult | null>;
  dispose: () => void;
};

type Waiting = { job: LayoutJob; resolve: (result: LayoutResult | null) => void };
type Running = Waiting & { seq: number };
type WorkerReply = { seq: number; result: LayoutResult };

export function createLayoutRunner(): LayoutRunner {
  let worker: Worker | null = null;
  let broken = false;
  let disposed = false;
  let seq = 0;
  let running: Running | null = null;
  let queued: Waiting | null = null;

  const runHere = (waiting: Waiting) => {
    const { words, params, hint } = waiting.job;
    waiting.resolve(computeLayout(words, params, hint));
  };

  const useMainThread = () => {
    broken = true;
    worker?.terminate();
    worker = null;
    const stranded = running;
    running = null;
    if (stranded) runHere(stranded);
    const next = queued;
    queued = null;
    if (next) runHere(next);
  };

  const start = (waiting: Waiting) => {
    if (!worker) {
      runHere(waiting);
      return;
    }
    seq++;
    running = { ...waiting, seq };
    worker.postMessage({ seq, ...waiting.job });
  };

  const ensureWorker = () => {
    if (worker || broken) return;
    try {
      const created = new Worker(new URL("./layout.worker.ts", import.meta.url), { type: "module" });
      created.onmessage = (event: MessageEvent<WorkerReply>) => {
        if (!running || running.seq !== event.data.seq) return;
        const done = running;
        running = null;
        done.resolve(event.data.result);
        const next = queued;
        queued = null;
        if (next && !disposed) start(next);
      };
      created.onerror = useMainThread;
      created.onmessageerror = useMainThread;
      worker = created;
    } catch {
      broken = true;
    }
  };

  return {
    run(job) {
      if (disposed) return Promise.resolve(null);
      ensureWorker();
      return new Promise((resolve) => {
        const waiting: Waiting = { job, resolve };
        if (!worker) {
          runHere(waiting);
          return;
        }
        if (running) {
          queued?.resolve(null);
          queued = waiting;
          return;
        }
        start(waiting);
      });
    },
    dispose() {
      disposed = true;
      worker?.terminate();
      worker = null;
      running?.resolve(null);
      running = null;
      queued?.resolve(null);
      queued = null;
    },
  };
}
