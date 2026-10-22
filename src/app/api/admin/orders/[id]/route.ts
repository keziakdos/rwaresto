import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  handleApiError,
  json,
  readJson,
} from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const schema = z.object({
  removeItemIds: z.array(z.string()).max(40).default([]),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin", "cashier"]);
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    const order = await prisma.order.findUnique({
      where: { id },
      include: { items: true },
    });
    if (!order) return apiError("Commande introuvable.", 404);
    if (order.status !== "submitted") {
      return apiError("Une commande ne peut être modifiée qu'avant validation.", 409);
    }
    const removeIds = parsed.data.removeItemIds || [];
    const toRemove = order.items.filter((item) => removeIds.includes(item.id));
    if (!toRemove.length) return apiError("Aucun article à retirer.", 422);
    if (toRemove.length >= order.items.length) {
      return apiError(
        "Il resterait au moins un article. Utilisez plutôt l'annulation de la commande.",
        422,
      );
    }

    const remaining = order.items.filter(
      (item) => !removeIds.includes(item.id),
    );
    const totalCents = remaining.reduce((sum, item) => sum + item.lineTotalCents, 0);

    const updated = await prisma.$transaction(async (tx) => {
      await tx.orderItem.deleteMany({ where: { id: { in: toRemove.map((i) => i.id) } } });
      return tx.order.update({
        where: { id },
        data: { subtotalCents: totalCents, totalCents },
        include: { items: { include: { options: true } } },
      });
    });

    await audit({
      actorId: auth.user.id,
      action: "order.edited",
      entityType: "order",
      entityId: id,
      orderId: id,
      details: { removedItems: toRemove.map((item) => item.nameSnapshot), totalCents },
    });
    publish({
      type: "order.updated",
      orderId: id,
      orderNumber: order.orderNumber,
      status: order.status,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
    });

    return json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
