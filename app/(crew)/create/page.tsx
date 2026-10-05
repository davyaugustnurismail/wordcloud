import type { Metadata } from "next";
import { CreateForm } from "@/components/create-form";
import { listLibraryAssetIds } from "@/lib/assets";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Create Session" };

export default async function CreatePage() {
  const [photowall, input] = await Promise.all([
    listLibraryAssetIds("photowall_bg"),
    listLibraryAssetIds("input_bg"),
  ]);
  return <CreateForm library={{ photowall, input }} />;
}
