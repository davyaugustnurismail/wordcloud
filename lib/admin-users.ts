import { asc, eq } from "drizzle-orm";
import { getDb } from "./db";
import { adminUsers } from "./db/schema";

export type AdminUser = {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  signedIn: boolean;
  lastLoginAt: number | null;
  createdAt: number;
  createdBy: string | null;
};

export type GoogleProfile = { sub: string; email: string; name: string | null };

export type GoogleLoginResult =
  | { status: "ok"; user: AdminUser }
  | { status: "not_registered" | "inactive" | "conflict" };

function toUser(row: typeof adminUsers.$inferSelect): AdminUser {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    active: row.active,
    signedIn: row.googleSub !== null,
    lastLoginAt: row.lastLoginAt ? row.lastLoginAt.getTime() : null,
    createdAt: row.createdAt.getTime(),
    createdBy: row.createdBy,
  };
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isUniqueViolation(err: unknown): boolean {
  const error = err as { code?: string; cause?: { code?: string } } | null;
  return error?.code === "23505" || error?.cause?.code === "23505";
}

export async function listAdminUsers(): Promise<AdminUser[]> {
  const rows = await getDb().select().from(adminUsers).orderBy(asc(adminUsers.createdAt), asc(adminUsers.email));
  return rows.map(toUser);
}

export async function findAdminUser(id: string): Promise<AdminUser | null> {
  const [row] = await getDb().select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return row ? toUser(row) : null;
}

export async function addAdminUser(input: { email: string; name: string | null; createdBy: string | null }): Promise<AdminUser | null> {
  try {
    const [row] = await getDb()
      .insert(adminUsers)
      .values({ email: normalizeEmail(input.email), name: input.name, createdBy: input.createdBy })
      .returning();
    return row ? toUser(row) : null;
  } catch (err) {
    if (isUniqueViolation(err)) return null;
    throw err;
  }
}

export async function setAdminUserActive(id: string, active: boolean): Promise<AdminUser | null> {
  const [row] = await getDb().update(adminUsers).set({ active }).where(eq(adminUsers.id, id)).returning();
  return row ? toUser(row) : null;
}

export async function deleteAdminUser(id: string): Promise<boolean> {
  const rows = await getDb().delete(adminUsers).where(eq(adminUsers.id, id)).returning({ id: adminUsers.id });
  return rows.length > 0;
}

export async function loginWithGoogle(profile: GoogleProfile): Promise<GoogleLoginResult> {
  const db = getDb();
  const email = normalizeEmail(profile.email);

  const [bySub] = await db.select().from(adminUsers).where(eq(adminUsers.googleSub, profile.sub)).limit(1);
  const row = bySub ?? (await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1))[0];
  if (!row) return { status: "not_registered" };
  if (row.googleSub && row.googleSub !== profile.sub) return { status: "conflict" };
  if (!row.active) return { status: "inactive" };

  const [updated] = await db
    .update(adminUsers)
    .set({
      googleSub: profile.sub,
      lastLoginAt: new Date(),
      name: row.name ?? profile.name,
      ...(row.email === email ? {} : { email }),
    })
    .where(eq(adminUsers.id, row.id))
    .returning();
  return updated ? { status: "ok", user: toUser(updated) } : { status: "not_registered" };
}
