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

const timeSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.");
const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date invalide.");

const schema = z.object({
  name: z.string().trim().min(2, "Nom de catégorie requis.").max(50),
  image: z.string().trim().max(500).nullable().optional(),
  availableFrom: timeSchema.nullable().optional(),
  availableTo: timeSchema.nullable().optional(),
  availableFromDate: dateSchema.nullable().optional(),
  availableToDate: dateSchema.nullable().optional(),
  active: z.boolean().optional(),
});

async function uniqueSlug(name: string) {
  const base = slugify(name) || "categorie";
  let slug = base;
  let index = 2;
  while (await prisma.category.findUnique({ where: { slug } })) {
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

    const count = await prisma.category.count();
    const category = await prisma.category.create({
      data: {
        name: parsed.data.name,
        slug: await uniqueSlug(parsed.data.name),
        image: parsed.data.image || null,
        availableFrom: parsed.data.availableFrom || null,
        availableTo: parsed.data.availableTo || null,
        availableFromDate: parsed.data.availableFromDate || null,
        availableToDate: parsed.data.availableToDate || null,
        sortOrder: count,
        active: parsed.data.active ?? true,
      },
    });
    await audit({
      actorId: auth.user.id,
      action: "category.created",
      entityType: "category",
      entityId: category.id,
      details: { name: category.name },
    });
    publish({ type: "menu.updated" });
    return json({ category }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
