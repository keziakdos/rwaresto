import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const schema = z.object({
  categoryId: z.string().min(1),
  ids: z.array(z.string()).min(1).max(300),
});

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    await prisma.$transaction(
      parsed.data.ids.map((id, index) =>
        prisma.product.update({
          where: { id, categoryId: parsed.data.categoryId },
          data: { sortOrder: index },
        }),
      ),
    );
    await audit({
      actorId: auth.user.id,
      action: "product.reordered",
      entityType: "product",
      details: { categoryId: parsed.data.categoryId, ids: parsed.data.ids },
    });
    publish({ type: "menu.updated" });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
