import { requireAdminPage } from "@/lib/page-auth";
import { TablesManager } from "@/components/admin/tables-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tables & QR codes" };

export default async function AdminTablesPage() {
  await requireAdminPage();
  return <TablesManager />;
}
