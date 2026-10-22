import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, json } from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { dayKey } from "@/lib/format";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { normalizeName } from "@/lib/normalize";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await apiRequireRole(request, ["admin", "cashier"]);
    if ("response" in auth) return auth.response;

    const q = (request.nextUrl.searchParams.get("q") || "").trim();
    const scope = request.nextUrl.searchParams.get("scope") || "board";
    const today = dayKey();
    const numeric = /^\d+$/.test(q) ? Number(q) : null;

    const searchFilter = q
      ? {
          AND: [
            {
              OR: [
                { customerName: { contains: q } },
                { customerNameNormalized: { contains: normalizeName(q) } },
                { orderNumber: { contains: q.toUpperCase() } },
                ...(numeric ? [{ tableNumber: numeric }] : []),
              ],
            },
          ],
        }
      : {};

    const scopeFilter =
      scope === "today"
        ? { dayKey: today }
        : scope === "active"
          ? { status: { in: ACTIVE_STATUSES } }
          : {
              OR: [{ status: { in: ACTIVE_STATUSES } }, { dayKey: today }],
            };

    const orders = await prisma.order.findMany({
      where: { ...scopeFilter, ...searchFilter },
      orderBy: [{ submittedAt: "desc" }],
      take: 300,
      include: {
        items: { include: { options: true }, orderBy: { createdAt: "asc" } },
        validatedBy: { select: { displayName: true } },
        readyBy: { select: { displayName: true } },
        paidBy: { select: { displayName: true } },
      },
    });

    return json({
      orders,
      tables: await prisma.diningTable.findMany({
        where: { active: true },
        orderBy: { number: "asc" },
        select: { number: true, label: true },
      }),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
