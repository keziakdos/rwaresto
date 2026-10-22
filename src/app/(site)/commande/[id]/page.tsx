import { OrderTracking } from "@/components/order-tracking";

export const metadata = {
  title: "Suivi de commande",
  robots: { index: false, follow: false },
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  return <OrderTracking orderId={id} token={t || ""} />;
}
