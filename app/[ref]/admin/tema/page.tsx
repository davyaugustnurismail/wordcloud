import { ThemeSettings } from "@/components/admin/theme-settings";
import { listLibraryAssetIds, listSessionAssetIds } from "@/lib/assets";
import { loadSessionForAdmin } from "@/lib/session-page";

export const dynamic = "force-dynamic";

export default async function AdminThemePage({ params }: { params: Promise<{ ref: string }> }) {
  const session = await loadSessionForAdmin((await params).ref);

  const [libraryPhotowall, libraryInput, ownPhotowall, ownInput] = await Promise.all([
    listLibraryAssetIds("photowall_bg"),
    listLibraryAssetIds("input_bg"),
    listSessionAssetIds(session.id, "photowall_bg"),
    listSessionAssetIds(session.id, "input_bg"),
  ]);

  return (
    <ThemeSettings
      code={session.code}
      library={{ photowall: libraryPhotowall, input: libraryInput }}
      own={{ photowall: ownPhotowall, input: ownInput }}
    />
  );
}
