import type { Metadata } from "next";
import { CreateForm } from "@/components/create-form";

export const metadata: Metadata = { title: "Create Session" };

export default function CreatePage() {
  return <CreateForm />;
}
