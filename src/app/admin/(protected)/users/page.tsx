import { requireAdminPage } from "@/lib/page-auth";
import { UsersManager } from "@/components/admin/users-manager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage() {
  const user = await requireAdminPage();
  return <UsersManager currentUserId={user.id} />;
}
