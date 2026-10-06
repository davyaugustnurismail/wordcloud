"use client";

import { useState, type FormEvent } from "react";
import { checkWord, normalizeWord } from "@/lib/words";
import { BlocklistImport } from "../blocklist-import";
import { AlertCircleIcon, LockIcon, PlusIcon, XIcon } from "../icons";
import { useToast } from "../ui/toast";

type Props = {
  code: string;
  initialTerms: string[];
  globalTerms: string[];
};

const MAX_TERM_CHARS = 40;

function requestError(status: number): string {
  if (status === 401) return "Sesi admin berakhir. Masuk lagi.";
  if (status === 400) return "Cukup satu kata, tanpa spasi.";
  return "Gagal menyimpan. Coba lagi.";
}

export function BlocklistManager({ code, initialTerms, globalTerms }: Props) {
  const toast = useToast();
  const [terms, setTerms] = useState(initialTerms);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const endpoint = `/api/sessions/${code}/blocklist`;

  const send = async (method: "POST" | "DELETE", term: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term }),
      });
      if (!response.ok) {
        setError(requestError(response.status));
        return false;
      }
      const result = (await response.json()) as { terms: string[] };
      setTerms(result.terms);
      toast.success(method === "POST" ? `"${term}" ditambahkan ke blocklist.` : `"${term}" dihapus dari blocklist.`);
      return true;
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (busy) return;
    const checked = checkWord(draft, MAX_TERM_CHARS);
    if (!checked.ok) {
      if (checked.reason === "space") setError("Cukup satu kata, tanpa spasi.");
      return;
    }
    if (await send("POST", normalizeWord(checked.text))) setDraft("");
  };

  return (
    <main className="flex flex-1 flex-wrap items-start gap-5 px-4 py-4 md:px-8 md:pb-12 md:pt-6">
      <section
        aria-label="Blocklist sesi ini"
        className="flex min-w-0 flex-[999_1_560px] flex-col gap-[18px] rounded-[18px] border border-line bg-surface p-5 md:p-6"
      >
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-[22px] font-extrabold tracking-[-0.01em]">Blocklist sesi ini</h1>
          <p className="m-0 text-sm leading-normal text-muted">
            Tambah istilah lokal atau kata yang muncul di tengah acara. Berlaku langsung di semua device input sesi ini.
          </p>
        </div>
        <form onSubmit={add} className="m-0 flex flex-wrap gap-2.5">
          <label htmlFor="term-sesi" className="sr-only">
            Kata baru
          </label>
          <input
            id="term-sesi"
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            placeholder="tambah kata"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="box-border h-[52px] min-w-0 flex-[999_1_260px] rounded-xl border border-line bg-field px-4 text-base text-fg focus:border-ring focus:outline-none"
          />
          <button
            type="submit"
            disabled={busy}
            className="flex h-[52px] items-center justify-center gap-2 rounded-xl bg-primary px-5 text-[15px] font-extrabold text-on-primary disabled:opacity-60"
          >
            <PlusIcon size={18} strokeWidth={2.4} />
            Tambah
          </button>
        </form>
        {error ? (
          <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertCircleIcon size={18} />
            {error}
          </span>
        ) : null}
        <BlocklistImport
          endpoint={`/api/sessions/${code}/blocklist/import`}
          target="Blocklist sesi ini"
          disabled={busy}
          onImported={setTerms}
        />
        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
            {terms.length} kata di sesi ini
          </span>
          {terms.length === 0 ? (
            <span className="text-sm text-muted">Belum ada kata. Blocklist global tetap berlaku.</span>
          ) : null}
          <div className="flex flex-wrap gap-2">
            {terms.map((term) => (
              <span
                key={term}
                className="flex h-[42px] items-center gap-1 rounded-full bg-surface2 pl-4 pr-1 text-[15px] font-bold"
              >
                {term}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => send("DELETE", term)}
                  aria-label={`Hapus ${term} dari blocklist`}
                  className="flex h-[34px] w-[34px] items-center justify-center rounded-full border-0 bg-transparent text-muted"
                >
                  <XIcon size={16} strokeWidth={2.4} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </section>

      <aside className="flex min-w-0 flex-[1_1_360px] flex-col gap-5">
        <section
          aria-label="Blocklist global"
          className="flex flex-col gap-3.5 rounded-[18px] border border-line bg-surface p-[22px]"
        >
          <div className="flex items-center justify-between gap-2.5">
            <h2 className="m-0 text-[17px] font-extrabold">Blocklist global</h2>
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-muted">
              <LockIcon size={14} strokeWidth={2.2} />
              Diatur admin global
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {globalTerms.map((term) => (
              <span
                key={term}
                className="flex h-9 items-center rounded-full border border-line px-3.5 text-sm font-semibold text-muted"
              >
                {term}
              </span>
            ))}
          </div>
          <span className="text-[13px] leading-normal text-muted">
            {globalTerms.length === 0 ? "Belum ada kata global. " : ""}Ikut berlaku di sesi ini.
          </span>
        </section>
        <section className="flex flex-col gap-2.5 rounded-[18px] bg-surface2 p-[22px]">
          <h2 className="m-0 text-[15px] font-extrabold">Cara kerja</h2>
          <ul className="m-0 flex list-disc flex-col gap-2 pl-[18px] text-sm leading-normal">
            <li>Dicocokkan setelah huruf kecil, jadi &quot;Kasar&quot; dan &quot;kasar&quot; sama.</li>
            <li>Audiens yang mengetik kata ini melihat jendela peringatan bahwa kata itu terlarang.</li>
            <li>Kata yang sudah tampil tidak hilang otomatis. Sembunyikan dari Live feed.</li>
          </ul>
        </section>
      </aside>
    </main>
  );
}
