import { redirect } from "next/navigation";
import { getCurrentUser, type SessionUser } from "./auth";

export async function requireStaffPage(options?: { allowPasswordChange?: boolean }): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  if (user.mustChangePassword && !options?.allowPasswordChange) {
    redirect("/admin/change-password");
  }
  return user;
}

export async function requireAdminPage(): Promise<SessionUser> {
  const user = await requireStaffPage();
  if (user.role !== "admin") redirect("/admin/orders");
  return user;
}
