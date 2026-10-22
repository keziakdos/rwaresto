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
import { groupSchema } from "@/lib/validation/option-groups";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, groupSchema);
    if (!parsed.ok) return parsed.response;

    const count = await prisma.optionGroup.count();
    const group = await prisma.optionGroup.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type,
        required: parsed.data.required,
        minSelections: parsed.data.minSelections,
        maxSelections: parsed.data.maxSelections,
        sortOrder: count,
        choices: {
          create: parsed.data.choices.map((choice, index) => ({
            name: choice.name,
            priceDeltaCents: choice.priceDeltaCents,
            available: choice.available,
            sortOrder: index,
          })),
        },
      },
      include: { choices: { orderBy: { sortOrder: "asc" } } },
    });
    await audit({
      actorId: auth.user.id,
      action: "option_group.created",
      entityType: "option_group",
      entityId: group.id,
      details: { name: group.name },
    });
    publish({ type: "menu.updated" });
    return json({ optionGroup: group }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
