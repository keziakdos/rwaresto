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
  number: z.number().int().min(1).max(999),
  label: z.string().trim().max(60).optional(),
  active: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const tables = await prisma.diningTable.findMany({ orderBy: { number: "asc" } });
    return json({ tables });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    const exists = await prisma.diningTable.findUnique({
      where: { number: parsed.data.number },
    });
    if (exists) return apiError("Ce numéro de table existe déjà.", 409);

    const table = await prisma.diningTable.create({
      data: {
        number: parsed.data.number,
        label: parsed.data.label || `Table ${parsed.data.number}`,
        active: parsed.data.active,
      },
    });
    await audit({
      actorId: auth.user.id,
      action: "table.created",
      entityType: "table",
      entityId: table.id,
      details: { number: table.number },
    });
    return json({ table }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
