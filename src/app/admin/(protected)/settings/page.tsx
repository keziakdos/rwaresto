import { requireAdminPage } from "@/lib/page-auth";
import { SettingsManager } from "@/components/admin/settings-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Paramètres" };

export default async function AdminSettingsPage() {
  await requireAdminPage();
  return <SettingsManager />;
}
