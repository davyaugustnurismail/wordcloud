"use client";

import { useEffect, useState } from "react";
import { slugProblem, slugProblemMessage, type SlugProblem } from "@/lib/slug";

export type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable"; reason: "taken" | "code" | SlugProblem }
  | { state: "error" };

const DEBOUNCE_MS = 350;

type Options = { code?: string };

type CheckResponse = { available: boolean; reason?: "taken" | "code" | SlugProblem };

export function useSlugAvailability(slug: string, { code }: Options = {}): SlugStatus {
  const [status, setStatus] = useState<SlugStatus>({ state: "idle" });

  useEffect(() => {
    if (slug.length === 0) {
      setStatus({ state: "idle" });
      return;
    }
    const problem = slugProblem(slug);
    if (problem) {
      setStatus({ state: "unavailable", reason: problem });
      return;
    }

    setStatus({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const query = code ? `?code=${encodeURIComponent(code)}` : "";
        const response = await fetch(`/api/slugs/${encodeURIComponent(slug)}${query}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          setStatus({ state: "error" });
          return;
        }
        const result = (await response.json()) as CheckResponse;
        setStatus(
          result.available ? { state: "available" } : { state: "unavailable", reason: result.reason ?? "taken" },
        );
      } catch (err) {
        if ((err as Error).name !== "AbortError") setStatus({ state: "error" });
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [slug, code]);

  return status;
}

export function slugStatusMessage(status: SlugStatus): { tone: "ok" | "bad" | "neutral"; text: string } | null {
  switch (status.state) {
    case "idle":
      return null;
    case "checking":
      return { tone: "neutral", text: "Memeriksa…" };
    case "available":
      return { tone: "ok", text: "Alamat tersedia." };
    case "error":
      return { tone: "neutral", text: "Belum bisa memeriksa. Alamat tetap dicek saat disimpan." };
    case "unavailable":
      if (status.reason === "taken") return { tone: "bad", text: "Alamat ini sudah dipakai sesi lain." };
      if (status.reason === "code") return { tone: "bad", text: "Alamat ini sama dengan kode sesi lain. Pilih yang lain." };
      return { tone: "bad", text: slugProblemMessage(status.reason) };
  }
}
