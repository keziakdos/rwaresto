import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, handleApiError, json } from "@/lib/api";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const token = request.nextUrl.searchParams.get("token");
    if (!token) return apiError("Lien de suivi incomplet.", 404);

    const order = await prisma.order.findFirst({
      where: { id, publicToken: token },
      include: {
        items: {
          include: { options: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
    if (!order) return apiError("Commande introuvable.", 404);

    return json({
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      mode: order.mode,
      tableNumber: order.tableNumber,
      customerName: order.customerName,
      note: order.note,
      cancelReason: order.cancelReason,
      subtotalCents: order.subtotalCents,
      totalCents: order.totalCents,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      submittedAt: order.submittedAt,
      validatedAt: order.validatedAt,
      readyAt: order.readyAt,
      completedAt: order.completedAt,
      cancelledAt: order.cancelledAt,
      items: order.items.map((item) => ({
        id: item.id,
        name: item.nameSnapshot,
        unitPriceCents: item.unitPriceCents,
        quantity: item.quantity,
        note: item.note,
        lineTotalCents: item.lineTotalCents,
        options: item.options.map((option) => ({
          groupName: option.groupNameSnapshot,
          choiceName: option.choiceNameSnapshot,
          priceDeltaCents: option.priceDeltaCents,
        })),
      })),
    });
  } catch (error) {
    return handleApiError(error);
  }
}
