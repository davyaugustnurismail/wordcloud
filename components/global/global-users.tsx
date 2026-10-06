"use client";

import { useState, type FormEvent } from "react";
import type { AdminUser } from "@/lib/admin-users";
import { AlertCircleIcon, PlusIcon, SpinnerIcon, TrashIcon } from "../icons";
import { ConfirmDialog } from "../ui/confirm-dialog";
import { btnDanger, btnOutline, btnPrimary, cardClass, fieldClass } from "../ui/styles";
import { useToast } from "../ui/toast";

type Props = {
  initialUsers: AdminUser[];
  currentUserId: string | null;
  googleEnabled: boolean;
};

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

function formatDateTime(timestamp: number): string {
  const date = new Date(timestamp);
  return `${dateFormat.format(date)}, ${timeFormat.format(date)}`;
}

function addError(status: number): string {
  if (status === 409) return "Email ini sudah terdaftar.";
  if (status === 400) return "Email tidak valid.";
  if (status === 401) return "Sesi admin berakhir. Masuk lagi.";
  return "User gagal ditambahkan. Coba lagi.";
}

function initialsOf(user: AdminUser): string {
  const source = user.name?.trim() || user.email;
  return source.slice(0, 1).toUpperCase();
}

export function GlobalUsers({ initialUsers, currentUserId, googleEnabled }: Props) {
  const toast = useToast();
  const [users, setUsers] = useState(initialUsers);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [removing, setRemoving] = useState<AdminUser | null>(null);

  const add = async (event: FormEvent) => {
    event.preventDefault();
    if (adding || !email.trim()) return;
    setAdding(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, ...(name.trim() ? { name } : {}) }),
      });
      if (!response.ok) {
        setError(addError(response.status));
        return;
      }
      const result = (await response.json()) as { users: AdminUser[] };
      setUsers(result.users);
      toast.success(`${email.trim().toLowerCase()} ditambahkan.`);
      setEmail("");
      setName("");
    } catch {
      setError("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setAdding(false);
    }
  };

  const mutate = async (user: AdminUser, init: RequestInit, success: string) => {
    setBusyId(user.id);
    try {
      const response = await fetch(`/api/admin/users/${user.id}`, init);
      if (!response.ok) {
        toast.error(response.status === 400 ? "Tidak bisa mengubah akun yang sedang kamu pakai." : "Perubahan gagal. Coba lagi.");
        return;
      }
      setUsers(((await response.json()) as { users: AdminUser[] }).users);
      toast.success(success);
    } catch {
      toast.error("Tidak bisa menghubungi server. Coba lagi.");
    } finally {
      setBusyId(null);
      setRemoving(null);
    }
  };

  const toggle = (user: AdminUser) =>
    mutate(
      user,
      { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ active: !user.active }) },
      user.active ? `${user.email} dinonaktifkan.` : `${user.email} diaktifkan.`,
    );

  return (
    <main className="flex min-w-0 flex-col gap-5 px-4 py-6 md:px-8 md:pb-12">
      <div className="flex flex-col gap-1">
        <h1 className="m-0 text-[30px] font-extrabold tracking-[-0.02em]">User admin global</h1>
        <span className="text-[15px] text-muted">
          Email di daftar ini boleh masuk ke Admin Global lewat Google. Password admin tetap bisa dipakai sebagai cadangan.
        </span>
      </div>

      {!googleEnabled ? (
        <div role="status" className="flex items-start gap-2.5 rounded-[14px] bg-warn/15 px-[18px] py-3.5 text-sm font-bold text-warn">
          <AlertCircleIcon size={18} className="mt-px shrink-0" />
          Login Google belum aktif di server ini. Isi GOOGLE_CLIENT_ID dan GOOGLE_CLIENT_SECRET di file .env, lalu jalankan ulang
          aplikasi.
        </div>
      ) : null}

      <section className={cardClass} aria-label="Tambah user">
        <h2 className="m-0 text-lg font-extrabold">Tambah user</h2>
        <form onSubmit={add} className="m-0 flex flex-wrap items-end gap-3">
          <div className="flex min-w-0 flex-[2_1_260px] flex-col gap-2">
            <label htmlFor="user-email" className="text-sm font-bold">
              Email Google
            </label>
            <input
              id="user-email"
              type="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setError(null);
              }}
              placeholder="nama@gmail.com"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck={false}
              className={fieldClass}
            />
          </div>
          <div className="flex min-w-0 flex-[1_1_200px] flex-col gap-2">
            <label htmlFor="user-nama" className="text-sm font-bold">
              Nama (opsional)
            </label>
            <input
              id="user-nama"
              type="text"
              value={name}
              maxLength={80}
              onChange={(event) => setName(event.target.value)}
              autoComplete="off"
              className={fieldClass}
            />
          </div>
          <button type="submit" disabled={adding || !email.trim()} className={`${btnPrimary} h-12`}>
            {adding ? <SpinnerIcon size={18} /> : <PlusIcon size={18} strokeWidth={2.4} />}
            Tambah
          </button>
        </form>
        {error ? (
          <span role="alert" className="flex items-center gap-2 text-sm font-bold text-danger">
            <AlertCircleIcon size={18} />
            {error}
          </span>
        ) : null}
      </section>

      <section className="flex flex-col gap-3" aria-label="Daftar user">
        <h2 className="m-0 text-lg font-extrabold">{users.length} user terdaftar</h2>
        {users.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-line-strong px-5 py-6 text-sm text-muted">
            Belum ada user. Tambahkan email Google pertama di atas supaya orang itu bisa masuk lewat tombol &quot;Masuk dengan
            Google&quot;.
          </div>
        ) : null}
        <ul className="m-0 flex list-none flex-col gap-3 p-0">
          {users.map((user) => {
            const self = user.id === currentUserId;
            const busy = busyId === user.id;
            return (
              <li
                key={user.id}
                className="flex flex-wrap items-center gap-x-4 gap-y-3 rounded-[18px] border border-line bg-surface px-4 py-3.5 md:px-5"
              >
                <span
                  aria-hidden="true"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-surface2 text-lg font-extrabold"
                >
                  {initialsOf(user)}
                </span>
                <div className="flex min-w-0 flex-[1_1_240px] flex-col gap-0.5">
                  <span className="flex flex-wrap items-center gap-2 text-[15px] font-extrabold">
                    <span className="truncate">{user.name ?? user.email}</span>
                    {self ? (
                      <span className="rounded-full bg-primary px-2 py-0.5 text-[11px] font-extrabold text-on-primary">Anda</span>
                    ) : null}
                    <span
                      className={`inline-flex h-[22px] items-center rounded-full px-2 text-[11px] font-extrabold ${
                        user.active ? "bg-live/15 text-live" : "bg-fg/10 text-muted"
                      }`}
                    >
                      {user.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </span>
                  {user.name ? <span className="truncate text-sm text-muted">{user.email}</span> : null}
                  <span className="text-[13px] text-muted" suppressHydrationWarning>
                    {user.lastLoginAt ? `Terakhir masuk ${formatDateTime(user.lastLoginAt)}` : "Belum pernah masuk"}
                    {user.createdBy ? ` · ditambahkan oleh ${user.createdBy}` : ""}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" disabled={busy || self} onClick={() => toggle(user)} className={btnOutline}>
                    {user.active ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                  <button
                    type="button"
                    disabled={busy || self}
                    onClick={() => setRemoving(user)}
                    aria-label={`Hapus ${user.email}`}
                    className={btnDanger}
                  >
                    <TrashIcon size={18} />
                    Hapus
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <ConfirmDialog
        open={removing !== null}
        title="Hapus user ini?"
        description={
          <>
            <b className="text-fg">{removing?.email}</b> tidak bisa masuk lagi dan sesi login yang sedang berjalan langsung berakhir.
          </>
        }
        confirmLabel="Ya, hapus"
        tone="danger"
        busy={busyId !== null}
        onConfirm={() =>
          removing &&
          void mutate(removing, { method: "DELETE" }, `${removing.email} dihapus.`)
        }
        onCancel={() => setRemoving(null)}
      />
    </main>
  );
}
