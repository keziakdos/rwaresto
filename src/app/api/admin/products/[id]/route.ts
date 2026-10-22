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
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(500).optional(),
  priceCents: z.number().int().min(0).max(1000000).optional(),
  categoryId: z.string().min(1).optional(),
  image: z.string().max(500).nullable().optional(),
  available: z.boolean().optional(),
  hidden: z.boolean().optional(),
  vegetarian: z.boolean().optional(),
  spicy: z.boolean().optional(),
  halal: z.boolean().optional(),
  isNew: z.boolean().optional(),
  archived: z.boolean().optional(),
  optionGroupIds: z.array(z.string()).max(30).optional(),
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

    const existing = await prisma.product.findUnique({ where: { id } });
    if (!existing) return apiError("Plat introuvable.", 404);
    if (parsed.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: parsed.data.categoryId },
      });
      if (!category) return apiError("Catégorie introuvable.", 422);
    }
    if (parsed.data.optionGroupIds) {
      const ids = [...new Set(parsed.data.optionGroupIds)];
      const groups = await prisma.optionGroup.count({ where: { id: { in: ids } } });
      if (groups !== ids.length) return apiError("Groupe d'options introuvable.", 422);
    }

    const { optionGroupIds, ...fields } = parsed.data;
    const product = await prisma.$transaction(async (tx) => {
      if (optionGroupIds) {
        await tx.productOptionGroup.deleteMany({ where: { productId: id } });
        if (optionGroupIds.length) {
          await tx.productOptionGroup.createMany({
            data: optionGroupIds.map((optionGroupId, index) => ({
              productId: id,
              optionGroupId,
              sortOrder: index,
            })),
          });
        }
      }
      return tx.product.update({
        where: { id },
        data: fields,
      });
    });

    await audit({
      actorId: auth.user.id,
      action: "product.updated",
      entityType: "product",
      entityId: id,
      details: { fields: Object.keys(parsed.data), name: product.name },
    });
    publish({ type: "menu.updated" });
    return json({ product });
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

    const product = await prisma.product.findUnique({
      where: { id },
      include: { _count: { select: { orderItems: true } } },
    });
    if (!product) return apiError("Plat introuvable.", 404);

    if (product._count.orderItems > 0) {
      await prisma.product.update({
        where: { id },
        data: { archived: true, hidden: true, available: false },
      });
      await audit({
        actorId: auth.user.id,
        action: "product.archived",
        entityType: "product",
        entityId: id,
        details: { name: product.name, reason: "historique de commandes" },
      });
      publish({ type: "menu.updated" });
      return json({ archived: true });
    }

    await prisma.product.delete({ where: { id } });
    await audit({
      actorId: auth.user.id,
      action: "product.deleted",
      entityType: "product",
      entityId: id,
      details: { name: product.name },
    });
    publish({ type: "menu.updated" });
    return json({ archived: false });
  } catch (error) {
    return handleApiError(error);
  }
}
