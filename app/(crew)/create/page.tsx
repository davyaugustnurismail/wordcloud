import type { Metadata } from "next";
import { CreateForm } from "@/components/create-form";
import { getSessionDefaults } from "@/lib/app-settings";
import { listLibraryAssetIds } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create Session" };

export default async function CreatePage() {
  const [photowall, input, defaults] = await Promise.all([
    listLibraryAssetIds("photowall_bg"),
    listLibraryAssetIds("input_bg"),
    getSessionDefaults(),
  ]);
  return <CreateForm library={{ photowall, input }} defaults={defaults} />;
}
