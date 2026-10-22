import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  handleApiError,
  json,
} from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { slugify } from "@/lib/normalize";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const { id } = await params;

    const source = await prisma.product.findUnique({
      where: { id },
      include: { optionGroups: true },
    });
    if (!source) return apiError("Plat introuvable.", 404);

    const baseName = `${source.name} (copie)`.slice(0, 80);
    let slug = slugify(baseName) || "copie";
    let index = 2;
    while (await prisma.product.findUnique({ where: { slug } })) {
      slug = `${slugify(baseName)}-${index}`;
      index += 1;
    }
    const maxOrder = await prisma.product.aggregate({
      where: { categoryId: source.categoryId },
      _max: { sortOrder: true },
    });

    const product = await prisma.product.create({
      data: {
        slug,
        name: baseName,
        description: source.description,
        priceCents: source.priceCents,
        categoryId: source.categoryId,
        image: source.image,
        available: source.available,
        hidden: true,
        vegetarian: source.vegetarian,
        spicy: source.spicy,
        halal: source.halal,
        isNew: source.isNew,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        optionGroups: {
          create: source.optionGroups.map((group) => ({
            optionGroupId: group.optionGroupId,
            sortOrder: group.sortOrder,
          })),
        },
      },
    });
    await audit({
      actorId: auth.user.id,
      action: "product.duplicated",
      entityType: "product",
      entityId: product.id,
      details: { from: source.id, name: product.name },
    });
    publish({ type: "menu.updated" });
    return json({ product }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
