import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, json } from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { dayKey } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/constants";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;

    const today = dayKey();
    const [todayOrders, activeCount, completedToday, tablesCount] = await Promise.all([
      prisma.order.findMany({
        where: { dayKey: today },
        include: { items: true },
      }),
      prisma.order.count({ where: { status: { in: ACTIVE_STATUSES } } }),
      prisma.order.findMany({
        where: { dayKey: today, status: "completed" },
        include: { items: true },
      }),
      prisma.diningTable.count({ where: { active: true } }),
    ]);

    const revenueCents = completedToday.reduce((sum, order) => sum + order.totalCents, 0);
    const productTotals = new Map<string, { name: string; quantity: number; revenueCents: number }>();
    for (const order of completedToday) {
      for (const item of order.items) {
        const current = productTotals.get(item.nameSnapshot) || {
          name: item.nameSnapshot,
          quantity: 0,
          revenueCents: 0,
        };
        current.quantity += item.quantity;
        current.revenueCents += item.lineTotalCents;
        productTotals.set(item.nameSnapshot, current);
      }
    }
    const topProducts = [...productTotals.values()]
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 8);

    const cancelled = todayOrders.filter((order) => order.status === "cancelled").length;
    const averageTicketCents = completedToday.length
      ? Math.round(revenueCents / completedToday.length)
      : 0;

    return json({
      dayKey: today,
      ordersToday: todayOrders.length,
      completedToday: completedToday.length,
      cancelledToday: cancelled,
      activeOrders: activeCount,
      revenueCents,
      averageTicketCents,
      tablesCount,
      topProducts,
    });
  } catch (error) {
    return handleApiError(error);
  }
}
