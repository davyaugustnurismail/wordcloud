"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { cleanSlugInput, slugify } from "@/lib/slug";
import { AlertCircleIcon, EyeIcon, EyeOffIcon, ExternalLinkIcon, LockIcon, RefreshIcon, SpinnerIcon } from "../icons";
import { slugStatusMessage, useSlugAvailability } from "../use-slug-availability";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { CopyButton } from "../ui/copy-button";
import { btnOutline, btnPrimary, cardClass, fieldClass } from "../ui/styles";
import { useToast } from "../ui/toast";
import { useAdmin } from "./admin-provider";
import { SwitchField } from "./settings-fields";

type InputAccess = { enabled: boolean; pin: string | null };

type Props = {
  origin: string;
  slug: string | null;
  initialAccess: InputAccess;
  inputQr: string;
};

type PendingChange = { body: { enabled?: boolean; pin?: string; regenerate?: boolean }; title: string; confirmLabel: string };

const PIN_PATTERN = /^\d{4,6}$/;

function hostOf(origin: string): string {
  return origin.split("://")[1] ?? origin;
}

function LinkRow({ label, url, openLabel }: { label: string; url: string; openLabel?: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[14px] bg-surface2 py-2.5 pl-4 pr-2.5">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">{label}</span>
        <span className="truncate font-mono text-sm font-bold">{hostOf(url)}</span>
      </div>
      <CopyButton
        value={url}
        label={`Salin tautan ${label.toLowerCase()}`}
        successMessage="Tautan tersalin"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg"
      />
      {openLabel ? (
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={openLabel}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-fg"
        >
          <ExternalLinkIcon size={18} />
        </a>
      ) : null}
    </div>
  );
}

function SlugCard({ origin, slug }: { origin: string; slug: string | null }) {
  const router = useRouter();
  const toast = useToast();
  const { code, name, ref } = useAdmin();
  const [draft, setDraft] = useState(slug ?? slugify(name));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const status = useSlugAvailability(draft, { code });
  const message = slugStatusMessage(status);
  const unchanged = draft === slug;
  const canSave = !unchanged && status.state === "available" && !saving;

  const save = async (event: FormEvent) => {
    event.preventDefault();
    if (!canSave) return;
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${code}/slug`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: draft }),
      });
      if (!response.ok) {
        setError(
          response.status === 409
            ? "Alamat ini baru saja dipakai sesi lain. Pilih yang lain."
            : response.status === 401
              ? "Sesi admin berakhir. Masuk lagi."
              : "Alamat tidak bisa disimpan. Coba lagi.",
        );
        return;
      }
      toast.success("Alamat sesi disimpan.");
      router.replace(`/${draft}/admin/akses`);
      router.refresh();
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className={cardClass} aria-label="Alamat sesi">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[19px] font-extrabold">Alamat sesi</h2>
        <p className="m-0 text-sm leading-normal text-muted">
          Alamat yang mudah diingat untuk halaman input dan photowall. Kode sesi <b className="font-mono text-fg">{code}</b>{" "}
          tetap berlaku sebagai cadangan.
        </p>
      </div>
      <form onSubmit={save} className="m-0 flex flex-col gap-2.5">
        <label htmlFor="slug-sesi" className="text-sm font-bold">
          Alamat
        </label>
        <div className="flex flex-wrap gap-2.5">
          <div className="flex min-w-0 flex-[999_1_300px] items-center rounded-xl border border-line bg-field focus-within:border-ring">
            <span className="shrink-0 truncate pl-3.5 text-[15px] font-semibold text-muted">{hostOf(origin)}/</span>
            <input
              id="slug-sesi"
              type="text"
              value={draft}
              maxLength={40}
              onChange={(event) => {
                setDraft(cleanSlugInput(event.target.value));
                setError(null);
              }}
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              aria-describedby="slug-bantu"
              className="box-border h-[50px] min-w-0 flex-1 border-0 bg-transparent pl-0.5 pr-3.5 text-[17px] font-semibold text-fg focus:outline-none"
            />
          </div>
          <button type="submit" disabled={!canSave} className={`${btnPrimary} h-[52px] flex-[1_1_140px]`}>
            {saving ? <SpinnerIcon size={18} /> : null}
            Simpan alamat
          </button>
        </div>
        <span
          id="slug-bantu"
          className={`text-[13px] ${
            message?.tone === "bad" ? "font-bold text-danger" : message?.tone === "ok" ? "font-bold text-live" : "text-muted"
          }`}
        >
          {unchanged ? (slug ? "Ini alamat sesi saat ini." : "Sesi ini belum punya alamat. Pakai saran dari nama atau ketik sendiri.") : (message?.text ?? "")}
        </span>
        {error ? (
          <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertCircleIcon size={18} />
            {error}
          </span>
        ) : null}
        {slug && !unchanged ? (
          <span className="text-[13px] leading-normal text-warn">
            Setelah disimpan, tautan dan QR dengan alamat lama (<b>{ref}</b>) tidak berlaku lagi. Bagikan ulang tautan barunya.
          </span>
        ) : null}
      </form>
    </section>
  );
}

function LinksCard({ origin, inputQr }: { origin: string; inputQr: string }) {
  const { code, ref } = useAdmin();
  return (
    <section className={cardClass} aria-label="Tautan sesi">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[19px] font-extrabold">Tautan sesi</h2>
        <p className="m-0 text-sm leading-normal text-muted">Salin untuk dibagikan, atau buka langsung di tab baru.</p>
      </div>
      <div className="flex flex-wrap items-start gap-5">
        <div className="flex min-w-0 flex-[1_1_320px] flex-col gap-2.5">
          <LinkRow label="Halaman input" url={`${origin}/${ref}/input`} openLabel="Buka halaman input di tab baru" />
          <LinkRow label="Photowall" url={`${origin}/${ref}/display`} openLabel="Buka photowall di tab baru" />
          <LinkRow label="Admin sesi" url={`${origin}/${ref}/admin`} />
          <span className="text-[13px] leading-normal text-muted">
            Kode sesi untuk halaman Join: <b className="font-mono text-fg">{code}</b>
          </span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div
            role="img"
            aria-label="QR halaman input"
            className="box-border h-[168px] w-[168px] rounded-[14px] border border-line bg-white p-3 [&>svg]:h-full [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: inputQr }}
          />
          <span className="text-xs text-muted">QR halaman input</span>
        </div>
      </div>
    </section>
  );
}

function PinCard({ initialAccess }: { initialAccess: InputAccess }) {
  const toast = useToast();
  const { code, presence } = useAdmin();
  const [access, setAccess] = useState(initialAccess);
  const [showPin, setShowPin] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingChange | null>(null);

  useEffect(() => {
    setDraft("");
  }, [access.pin]);

  const apply = async (body: PendingChange["body"], success: string) => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/sessions/${code}/input-access`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        setError(response.status === 401 ? "Sesi admin berakhir. Masuk lagi." : "Perubahan gagal disimpan. Coba lagi.");
        return;
      }
      setAccess((await response.json()) as InputAccess);
      toast.success(success);
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  const request = (change: PendingChange, success: string, kicksDevices: boolean) => {
    if (kicksDevices && presence.input > 0) {
      setPending(change);
      return;
    }
    void apply(change.body, success);
  };

  const pendingSuccess = pending?.body.regenerate
    ? "PIN baru dibuat."
    : pending?.body.pin
      ? "PIN input diperbarui."
      : "Proteksi PIN dinyalakan.";

  const draftValid = PIN_PATTERN.test(draft) && draft !== access.pin;

  return (
    <section className={cardClass} aria-label="Proteksi PIN halaman input">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[19px] font-extrabold">Proteksi halaman input</h2>
        <p className="m-0 text-sm leading-normal text-muted">
          Nyalakan agar hanya yang tahu PIN yang bisa membuka halaman input dan mengirim kata. Photowall tidak dikunci.
        </p>
      </div>

      <SwitchField
        id="pin-input-switch"
        label="Kunci halaman input dengan PIN"
        description={access.enabled ? "Aktif: audiens diminta PIN sebelum mengetik." : "Mati: siapa pun yang punya tautan atau kode bisa mengetik."}
        checked={access.enabled}
        onChange={(checked) =>
          checked
            ? request(
                { body: { enabled: true }, title: "Nyalakan proteksi PIN?", confirmLabel: "Nyalakan" },
                "Proteksi PIN dinyalakan.",
                true,
              )
            : void apply({ enabled: false }, "Proteksi PIN dimatikan.")
        }
      />

      {access.enabled && access.pin ? (
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between gap-3 rounded-[14px] bg-surface2 px-4 py-3.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-bold uppercase tracking-[0.08em] text-muted">PIN input</span>
              <span className="font-mono text-[28px] font-bold tracking-[0.12em]" aria-live="polite">
                {showPin ? access.pin : "•".repeat(access.pin.length)}
              </span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowPin((value) => !value)}
                aria-label={showPin ? "Sembunyikan PIN input" : "Tampilkan PIN input"}
                aria-pressed={showPin}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg"
              >
                {showPin ? <EyeOffIcon size={20} /> : <EyeIcon size={20} />}
              </button>
              <CopyButton
                value={access.pin}
                label="Salin PIN input"
                successMessage="PIN input tersalin"
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-surface text-fg"
              />
            </div>
          </div>

          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!draftValid || busy) return;
              request(
                { body: { pin: draft }, title: "Ganti PIN input?", confirmLabel: "Ganti PIN" },
                "PIN input diperbarui.",
                true,
              );
            }}
            className="m-0 flex flex-wrap items-end gap-2.5"
          >
            <div className="flex min-w-0 flex-[1_1_180px] flex-col gap-2">
              <label htmlFor="pin-input-baru" className="text-sm font-bold">
                PIN baru (4–6 angka)
              </label>
              <input
                id="pin-input-baru"
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={draft}
                onChange={(event) => setDraft(event.target.value.replace(/\D/g, "").slice(0, 6))}
                autoComplete="off"
                className={`${fieldClass} font-mono text-lg font-bold tracking-[0.2em]`}
              />
            </div>
            <button type="submit" disabled={!draftValid || busy} className={`${btnOutline} h-12`}>
              Simpan PIN
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                request(
                  { body: { regenerate: true }, title: "Acak PIN baru?", confirmLabel: "Acak PIN" },
                  "PIN baru dibuat.",
                  true,
                )
              }
              className={`${btnOutline} h-12`}
            >
              <RefreshIcon size={18} />
              Acak ulang
            </button>
          </form>
          <p className="m-0 flex items-start gap-2 text-[13px] leading-normal text-muted">
            <LockIcon size={16} className="mt-px shrink-0" />
            Mengganti atau mengacak PIN langsung mengeluarkan semua device input yang sedang terhubung, dan mereka diminta
            PIN baru.
          </p>
        </div>
      ) : null}

      {error ? (
        <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
          <AlertCircleIcon size={18} />
          {error}
        </span>
      ) : null}

      <ConfirmDialog
        open={pending !== null}
        title={pending?.title ?? ""}
        description={`${presence.input} device input sedang terhubung. Mereka akan keluar dan diminta memasukkan PIN lagi.`}
        confirmLabel={pending?.confirmLabel ?? "Lanjut"}
        busy={busy}
        onConfirm={() => pending && void apply(pending.body, pendingSuccess)}
        onCancel={() => setPending(null)}
      />
    </section>
  );
}

export function AccessSettings({ origin, slug, initialAccess, inputQr }: Props) {
  return (
    <main className="flex flex-1 flex-wrap items-start gap-5 px-4 py-4 md:px-8 md:pb-12 md:pt-6">
      <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-5">
        <SlugCard origin={origin} slug={slug} />
        <LinksCard origin={origin} inputQr={inputQr} />
      </div>
      <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-5">
        <PinCard initialAccess={initialAccess} />
      </div>
    </main>
  );
}
