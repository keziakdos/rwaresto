import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiRequireRole } from "@/lib/admin-guard";
import { dayKey } from "@/lib/format";

export const dynamic = "force-dynamic";

function escapeCsv(value: unknown): string {
  const text = String(value ?? "").replace(/"/g, '""');
  return `"${text}"`;
}

export async function GET(request: NextRequest) {
  const auth = await apiRequireRole(request, ["admin"]);
  if ("response" in auth) return auth.response;

  const from = request.nextUrl.searchParams.get("from") || dayKey();
  const to = request.nextUrl.searchParams.get("to") || from;

  const orders = await prisma.order.findMany({
    where: { dayKey: { gte: from, lte: to } },
    orderBy: { submittedAt: "asc" },
    include: { items: { include: { options: true } } },
  });

  const header = [
    "Date",
    "Commande",
    "Statut",
    "Mode",
    "Table",
    "Pseudo",
    "Téléphone",
    "Total EUR",
    "Paiement",
    "Mode paiement",
    "Articles",
    "Validée par",
    "Prête par",
    "Encaissée par",
  ];
  const lines = [header.map(escapeCsv).join(";")];

  for (const order of orders) {
    const items = order.items
      .map((item) => {
        const options = item.options
          .map((option) => `${option.groupNameSnapshot}: ${option.choiceNameSnapshot}`)
          .join(", ");
        return `${item.quantity}× ${item.nameSnapshot}${options ? ` (${options})` : ""}`;
      })
      .join(" | ");
    lines.push(
      [
        order.submittedAt.toISOString(),
        order.orderNumber,
        order.status,
        order.mode,
        order.tableNumber ?? "",
        order.customerName,
        order.phone ?? "",
        (order.totalCents / 100).toFixed(2),
        order.paymentStatus,
        order.paymentMethod ?? "",
        items,
        order.validatedById ?? "",
        order.readyById ?? "",
        order.paidById ?? "",
      ]
        .map(escapeCsv)
        .join(";"),
    );
  }

  return new Response(`\uFEFF${lines.join("\r\n")}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="rwaresto-commandes-${from}_${to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
