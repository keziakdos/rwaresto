import { requireStaffPage } from "@/lib/page-auth";
import { OrdersBoard } from "@/components/admin/orders-board";

export const dynamic = "force-dynamic";
export const metadata = { title: "Commandes" };

export default async function AdminOrdersPage() {
  const user = await requireStaffPage();
  return <OrdersBoard user={user} />;
}
