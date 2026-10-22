import { requireStaffPage } from "@/lib/page-auth";
import { AdminShell } from "@/components/admin/admin-shell";

export const dynamic = "force-dynamic";

export default async function ProtectedAdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireStaffPage();
  return <AdminShell user={user}>{children}</AdminShell>;
}
