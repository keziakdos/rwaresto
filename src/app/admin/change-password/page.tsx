import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { ChangePasswordForm } from "@/components/admin/change-password-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Changer le mot de passe" };

export default async function ChangePasswordPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return <ChangePasswordForm user={user} />;
}
