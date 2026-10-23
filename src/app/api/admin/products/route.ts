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
import { slugify } from "@/lib/normalize";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const schema = z.object({
  name: z.string().trim().min(2, "Nom du plat requis.").max(80),
  description: z.string().trim().max(500).default(""),
  priceCents: z.number().int().min(0).max(1000000),
  categoryId: z.string().min(1, "Choisissez une catégorie."),
  image: z.string().max(500).nullable().optional(),
  available: z.boolean().default(true),
  hidden: z.boolean().default(false),
  vegetarian: z.boolean().default(false),
  vegan: z.boolean().default(false),
  spicy: z.boolean().default(false),
  halal: z.boolean().default(false),
  isNew: z.boolean().default(false),
  optionGroupIds: z.array(z.string()).max(30).default([]),
});

async function uniqueSlug(name: string) {
  const base = slugify(name) || "plat";
  let slug = base;
  let index = 2;
  while (await prisma.product.findUnique({ where: { slug } })) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    const category = await prisma.category.findUnique({
      where: { id: parsed.data.categoryId },
    });
    if (!category) return apiError("Catégorie introuvable.", 422);

    const optionGroupIds = parsed.data.optionGroupIds || [];
    if (optionGroupIds.length) {
      const groups = await prisma.optionGroup.count({
        where: { id: { in: optionGroupIds } },
      });
      if (groups !== new Set(optionGroupIds).size) {
        return apiError("Un groupe d'options est introuvable.", 422);
      }
    }

    const maxOrder = await prisma.product.aggregate({
      where: { categoryId: parsed.data.categoryId },
      _max: { sortOrder: true },
    });

    const product = await prisma.product.create({
      data: {
        slug: await uniqueSlug(parsed.data.name),
        name: parsed.data.name,
        description: parsed.data.description,
        priceCents: parsed.data.priceCents,
        categoryId: parsed.data.categoryId,
        image: parsed.data.image || null,
        available: parsed.data.available,
        hidden: parsed.data.hidden,
        vegetarian: parsed.data.vegetarian,
        vegan: parsed.data.vegan,
        spicy: parsed.data.spicy,
        halal: parsed.data.halal,
        isNew: parsed.data.isNew,
        sortOrder: (maxOrder._max.sortOrder ?? -1) + 1,
        optionGroups: {
          create: optionGroupIds.map((optionGroupId, index) => ({
            optionGroupId,
            sortOrder: index,
          })),
        },
      },
      include: { optionGroups: true },
    });
    await audit({
      actorId: auth.user.id,
      action: "product.created",
      entityType: "product",
      entityId: product.id,
      details: { name: product.name, priceCents: product.priceCents },
    });
    publish({ type: "menu.updated" });
    return json({ product }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
