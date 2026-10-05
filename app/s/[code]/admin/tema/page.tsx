import { notFound, redirect } from "next/navigation";
import { ThemeSettings } from "@/components/admin/theme-settings";
import { listLibraryAssetIds, listSessionAssetIds } from "@/lib/assets";
import { hasAdminAccess } from "@/lib/auth/access";
import { isValidCode, normalizeCode } from "@/lib/code";
import { findSessionByCode } from "@/lib/sessions";

export const dynamic = "force-dynamic";

export default async function AdminThemePage({ params }: { params: Promise<{ code: string }> }) {
  const code = normalizeCode((await params).code);
  const session = isValidCode(code) ? await findSessionByCode(code) : null;
  if (!session) notFound();
  if (!(await hasAdminAccess(code))) redirect(`/masuk-admin?kode=${code}`);

  const [libraryPhotowall, libraryInput, ownPhotowall, ownInput] = await Promise.all([
    listLibraryAssetIds("photowall_bg"),
    listLibraryAssetIds("input_bg"),
    listSessionAssetIds(session.id, "photowall_bg"),
    listSessionAssetIds(session.id, "input_bg"),
  ]);

  return (
    <ThemeSettings
      code={code}
      library={{ photowall: libraryPhotowall, input: libraryInput }}
      own={{ photowall: ownPhotowall, input: ownInput }}
    />
  );
}
