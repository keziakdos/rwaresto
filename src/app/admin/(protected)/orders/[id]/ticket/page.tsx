import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireStaffPage } from "@/lib/page-auth";
import { getPublicConfig } from "@/lib/settings";
import { formatDateTime, formatMoney } from "@/lib/format";
import { PAYMENT_METHODS, MODE_LABELS } from "@/lib/constants";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ticket", robots: { index: false, follow: false } };

export default async function TicketPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaffPage();
  const { id } = await params;
  const [order, site] = await Promise.all([
    prisma.order.findUnique({
      where: { id },
      include: { items: { include: { options: true } } },
    }),
    getPublicConfig(),
  ]);
  if (!order) notFound();

  return (
    <div className="mx-auto max-w-sm py-4">
      <div className="no-print mb-4 flex items-center justify-between gap-2">
        <div>
          <h1 className="font-display text-xl font-bold text-forest">Ticket {order.orderNumber}</h1>
          <p className="text-xs text-stone-500">Format 80 mm, prêt pour l'imprimante.</p>
        </div>
        <PrintButton />
      </div>

      <div className="ticket mx-auto rounded-xl bg-white p-4 font-mono text-[11px] leading-relaxed text-black shadow-card print:shadow-none">
        <div className="text-center">
          <p className="text-base font-bold uppercase tracking-wide">{site.restaurantName}</p>
          <p>{site.address}</p>
          <p>{site.phone}</p>
        </div>
        <div className="my-2 border-t border-dashed border-black/40" />
        <div className="flex justify-between">
          <span>Commande</span>
          <span className="text-base font-bold">{order.orderNumber}</span>
        </div>
        <div className="flex justify-between">
          <span>{MODE_LABELS[order.mode as "dine_in" | "takeaway"]}</span>
          <span className="font-bold">
            {order.mode === "dine_in" ? `Table ${order.tableNumber}` : "À emporter"}
          </span>
        </div>
        <div className="flex justify-between">
          <span>Client</span>
          <span className="font-bold uppercase">{order.customerName}</span>
        </div>
        <div className="flex justify-between">
          <span>Date</span>
          <span>{formatDateTime(order.submittedAt)}</span>
        </div>
        <div className="my-2 border-t border-dashed border-black/40" />
        {order.items.map((item) => (
          <div key={item.id} className="mb-1.5">
            <div className="flex justify-between gap-2">
              <span className="font-bold">
                {item.quantity}× {item.nameSnapshot}
              </span>
              <span>{formatMoney(item.lineTotalCents, site.currency)}</span>
            </div>
            {item.options.length ? (
              <div className="pl-3 text-[10px]">
                {item.options.map((option) => option.choiceNameSnapshot).join(" · ")}
              </div>
            ) : null}
            {item.note ? <div className="pl-3 text-[10px] italic">« {item.note} »</div> : null}
          </div>
        ))}
        <div className="my-2 border-t border-dashed border-black/40" />
        <div className="flex justify-between text-sm font-bold">
          <span>TOTAL</span>
          <span>{formatMoney(order.totalCents, site.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span>Paiement</span>
          <span>
            {order.paymentStatus === "paid" && order.paymentMethod
              ? PAYMENT_METHODS[order.paymentMethod as "cash" | "card"]
              : "À encaisser"}
          </span>
        </div>
        {order.note ? <p className="mt-2 border-t border-dashed border-black/40 pt-2">Note : {order.note}</p> : null}
        <div className="my-2 border-t border-dashed border-black/40" />
        <p className="text-center font-bold">Merci et bon appétit !</p>
        <p className="text-center text-[9px]">rwaresto · commande à table</p>
      </div>
    </div>
  );
}
