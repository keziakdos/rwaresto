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
import { canTransition } from "@/lib/transitions";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const schema = z.object({
  action: z.enum(["validate", "ready", "complete", "cancel"]),
  paymentMethod: z.enum(["cash", "card"]).optional(),
  reason: z.string().trim().max(300).optional(),
});

const TARGET = {
  validate: "in_progress",
  ready: "ready",
  complete: "completed",
  cancel: "cancelled",
} as const;

export async function POST(
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
    const { action, paymentMethod, reason } = parsed.data;
    const target = TARGET[action];

    const order = await prisma.order.findUnique({ where: { id } });
    if (!order) return apiError("Commande introuvable.", 404);
    if (!canTransition(order.status, target)) {
      return apiError(
        `Impossible de passer cette commande de « ${order.status} » à « ${target} ».`,
        409,
      );
    }
    if (action === "complete" && !paymentMethod) {
      return apiError("Indiquez le mode de paiement (espèces ou carte).", 422);
    }
    if (action === "cancel" && !reason?.trim()) {
      return apiError("Indiquez le motif d'annulation.", 422);
    }

    const now = new Date();
    const data: Record<string, unknown> = { status: target };
    if (action === "validate") {
      data.validatedAt = now;
      data.validatedById = auth.user.id;
    }
    if (action === "ready") {
      data.readyAt = now;
      data.readyById = auth.user.id;
    }
    if (action === "complete") {
      data.completedAt = now;
      data.paidById = auth.user.id;
      data.paymentStatus = "paid";
      data.paymentMethod = paymentMethod;
    }
    if (action === "cancel") {
      data.cancelledAt = now;
      data.cancelReason = reason?.trim();
    }

    const updated = await prisma.order.update({
      where: { id },
      data,
      include: { items: { include: { options: true } } },
    });

    await audit({
      actorId: auth.user.id,
      action: `order.${action}`,
      entityType: "order",
      entityId: id,
      orderId: id,
      details: { from: order.status, to: target, paymentMethod, reason },
    });
    publish({
      type: "order.updated",
      orderId: id,
      orderNumber: order.orderNumber,
      status: target,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
    });

    return json(updated);
  } catch (error) {
    return handleApiError(error);
  }
}
