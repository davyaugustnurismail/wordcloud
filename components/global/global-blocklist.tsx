"use client";

import { useEffect, useState, type FormEvent } from "react";
import { checkWord, normalizeWord } from "@/lib/words";
import { BlocklistImport } from "../blocklist-import";
import { AlertCircleIcon, PlusIcon, XIcon } from "../icons";
import { useToast } from "../ui/toast";

type SessionOption = { id: string; name: string; code: string };

type Props = {
  sessions: SessionOption[];
  globalTerms: string[];
};

const MAX_TERM_CHARS = 40;

function requestError(status: number): string {
  if (status === 401) return "Sesi admin berakhir. Masuk lagi.";
  if (status === 400) return "Cukup satu kata, tanpa spasi.";
  return "Gagal menyimpan. Coba lagi.";
}

function Chip({
  term,
  dashed,
  disabled,
  onRemove,
}: {
  term: string;
  dashed?: boolean;
  disabled: boolean;
  onRemove: () => void;
}) {
  return (
    <span
      className={`flex h-10 items-center gap-1 rounded-full pl-3.5 pr-1 text-[15px] font-bold ${
        dashed ? "border border-dashed border-line-strong" : "bg-surface2"
      }`}
    >
      {term}
      <button
        type="button"
        disabled={disabled}
        onClick={onRemove}
        aria-label={`Hapus ${term} dari blocklist`}
        className="flex h-8 w-8 items-center justify-center rounded-full border-0 bg-transparent text-muted"
      >
        <XIcon size={16} strokeWidth={2.4} />
      </button>
    </span>
  );
}

export function GlobalBlocklist({ sessions, globalTerms }: Props) {
  const toast = useToast();
  const [scope, setScope] = useState("global");
  const [globalList, setGlobalList] = useState(globalTerms);
  const [sessionList, setSessionList] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selected = sessions.find((session) => session.id === scope) ?? null;

  useEffect(() => {
    if (scope === "global") {
      setSessionList([]);
      return;
    }
    let active = true;
    void fetch(`/api/admin/blocklist?scope=${scope}`, { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { terms: string[] } | null) => {
        if (active && data) setSessionList(data.terms);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [scope]);

  const send = async (method: "POST" | "DELETE", term: string, target: string): Promise<boolean> => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/blocklist", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ term, scope: target }),
      });
      if (!response.ok) {
        setError(requestError(response.status));
        return false;
      }
      const result = (await response.json()) as { terms: string[] };
      if (target === "global") setGlobalList(result.terms);
      else setSessionList(result.terms);
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
    if (await send("POST", normalizeWord(checked.text), scope)) setDraft("");
  };

  return (
    <main className="flex min-w-0 flex-col gap-5 px-4 py-6 md:px-8 md:pb-12">
      <section id="blocklist" className="flex flex-col gap-[18px] rounded-[18px] border border-line bg-surface p-5 md:p-6">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 text-2xl font-extrabold tracking-[-0.01em]">Blocklist kata</h1>
          <p className="m-0 text-sm leading-normal text-muted">
            Tidak ada filter bawaan. Hanya kata di daftar ini yang ditolak, dicocokkan setelah huruf kecil. Audiens yang
            mengetik kata terlarang melihat jendela peringatan.
          </p>
        </div>
        <form onSubmit={add} className="m-0 flex flex-wrap gap-2.5">
          <label htmlFor="term-baru" className="sr-only">
            Kata baru
          </label>
          <input
            id="term-baru"
            type="text"
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
              setError(null);
            }}
            placeholder="tambah kata, termasuk istilah lokal"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="box-border h-12 min-w-0 flex-[999_1_260px] rounded-xl border border-line bg-field px-3.5 text-base text-fg focus:border-ring focus:outline-none"
          />
          <label htmlFor="scope" className="sr-only">
            Berlaku untuk
          </label>
          <select
            id="scope"
            value={scope}
            onChange={(event) => setScope(event.target.value)}
            className="box-border h-12 flex-[1_1_180px] rounded-xl border border-line bg-field px-3 text-[15px] font-semibold text-fg"
          >
            <option value="global">Semua sesi (global)</option>
            {sessions.map((session) => (
              <option key={session.id} value={session.id}>
                {session.name} ({session.code})
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="flex h-12 items-center gap-2 rounded-xl border-0 bg-primary px-[18px] text-[15px] font-extrabold text-on-primary disabled:opacity-60"
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
          endpoint="/api/admin/blocklist/import"
          scope={scope}
          target={selected ? `Khusus ${selected.name}` : "Blocklist global (semua sesi)"}
          disabled={busy}
          onImported={(terms) => (scope === "global" ? setGlobalList(terms) : setSessionList(terms))}
        />

        <div className="flex flex-col gap-2.5">
          <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
            Global · {globalList.length} kata
          </span>
          {globalList.length === 0 ? <span className="text-sm text-muted">Belum ada kata global.</span> : null}
          <div className="flex flex-wrap gap-2">
            {globalList.map((term) => (
              <Chip key={term} term={term} disabled={busy} onRemove={() => send("DELETE", term, "global")} />
            ))}
          </div>
        </div>

        {selected ? (
          <div className="flex flex-col gap-2.5">
            <span className="text-[13px] font-bold uppercase tracking-[0.06em] text-muted">
              Khusus {selected.name} · {sessionList.length} kata
            </span>
            {sessionList.length === 0 ? <span className="text-sm text-muted">Belum ada kata khusus sesi ini.</span> : null}
            <div className="flex flex-wrap gap-2">
              {sessionList.map((term) => (
                <Chip key={term} term={term} dashed disabled={busy} onRemove={() => send("DELETE", term, scope)} />
              ))}
            </div>
          </div>
        ) : (
          <span className="text-[13px] text-muted">
            Pilih sesi pada kolom &quot;Berlaku untuk&quot; untuk melihat dan mengubah blocklist khusus sesi itu.
          </span>
        )}
      </section>
    </main>
  );
}
