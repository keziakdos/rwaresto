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

export const dynamic = "force-dynamic";

const schema = z.object({
  number: z.number().int().min(1).max(999).optional(),
  label: z.string().trim().max(60).optional(),
  active: z.boolean().optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    const existing = await prisma.diningTable.findUnique({ where: { id } });
    if (!existing) return apiError("Table introuvable.", 404);
    if (parsed.data.number && parsed.data.number !== existing.number) {
      const duplicate = await prisma.diningTable.findUnique({
        where: { number: parsed.data.number },
      });
      if (duplicate) return apiError("Ce numéro de table existe déjà.", 409);
    }

    const table = await prisma.diningTable.update({
      where: { id },
      data: parsed.data,
    });
    await audit({
      actorId: auth.user.id,
      action: "table.updated",
      entityType: "table",
      entityId: id,
      details: parsed.data,
    });
    return json({ table });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const table = await prisma.diningTable.findUnique({ where: { id } });
    if (!table) return apiError("Table introuvable.", 404);

    const orders = await prisma.order.count({ where: { tableNumber: table.number } });
    if (orders > 0) {
      await prisma.diningTable.update({ where: { id }, data: { active: false } });
      await audit({
        actorId: auth.user.id,
        action: "table.deactivated",
        entityType: "table",
        entityId: id,
        details: { number: table.number, orders },
      });
      return json({ deactivated: true });
    }

    await prisma.diningTable.delete({ where: { id } });
    await audit({
      actorId: auth.user.id,
      action: "table.deleted",
      entityType: "table",
      entityId: id,
      details: { number: table.number },
    });
    return json({ deactivated: false });
  } catch (error) {
    return handleApiError(error);
  }
}
