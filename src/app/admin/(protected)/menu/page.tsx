import { requireAdminPage } from "@/lib/page-auth";
import { MenuManager } from "@/components/admin/menu-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Gestion du menu" };

export default async function AdminMenuPage() {
  await requireAdminPage();
  return <MenuManager />;
}
