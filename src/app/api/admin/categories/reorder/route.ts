import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, assertSameOrigin, handleApiError, json, readJson } from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { publish } from "@/lib/realtime";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ ids: z.array(z.string()).min(1).max(200) });

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    await prisma.$transaction(
      parsed.data.ids.map((id, index) =>
        prisma.category.update({ where: { id }, data: { sortOrder: index } }),
      ),
    );
    await audit({
      actorId: auth.user.id,
      action: "category.reordered",
      entityType: "category",
      details: { ids: parsed.data.ids },
    });
    publish({ type: "menu.updated" });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
