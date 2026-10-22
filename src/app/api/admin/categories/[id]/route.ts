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
  name: z.string().trim().min(2).max(50).optional(),
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

    const existing = await prisma.category.findUnique({ where: { id } });
    if (!existing) return apiError("Catégorie introuvable.", 404);

    const category = await prisma.category.update({
      where: { id },
      data: parsed.data,
    });
    await audit({
      actorId: auth.user.id,
      action: "category.updated",
      entityType: "category",
      entityId: id,
      details: parsed.data,
    });
    publish({ type: "menu.updated" });
    return json({ category });
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

    const category = await prisma.category.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    });
    if (!category) return apiError("Catégorie introuvable.", 404);
    if (category._count.products > 0) {
      return apiError(
        "Cette catégorie contient encore des plats. Déplacez-les ou supprimez-les d'abord.",
        409,
      );
    }

    await prisma.category.delete({ where: { id } });
    await audit({
      actorId: auth.user.id,
      action: "category.deleted",
      entityType: "category",
      entityId: id,
      details: { name: category.name },
    });
    publish({ type: "menu.updated" });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
