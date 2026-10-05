import { GlobalSettings } from "@/components/global/global-settings";
import { getSessionDefaults } from "@/lib/app-settings";
import { listLibraryImages } from "@/lib/library";

export const dynamic = "force-dynamic";

export default async function GlobalSettingsPage() {
  const [defaults, library] = await Promise.all([getSessionDefaults(), listLibraryImages()]);
  return <GlobalSettings defaults={defaults} library={library} />;
}
