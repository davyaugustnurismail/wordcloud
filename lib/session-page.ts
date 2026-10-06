import { notFound, redirect } from "next/navigation";
import { hasAdminAccess } from "./auth/access";
import { findSessionByRef, type SessionRecord } from "./sessions";

export async function loadSession(ref: string): Promise<SessionRecord> {
  const session = await findSessionByRef(ref);
  if (!session) notFound();
  return session;
}

export async function loadSessionForAdmin(ref: string): Promise<SessionRecord> {
  const session = await loadSession(ref);
  if (!(await hasAdminAccess(session.code))) redirect(`/masuk-admin?kode=${session.code}`);
  return session;
}
