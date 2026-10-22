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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const { id } = await params;
    const parsed = await readJson(request, groupSchema);
    if (!parsed.ok) return parsed.response;

    const existing = await prisma.optionGroup.findUnique({ where: { id } });
    if (!existing) return apiError("Groupe d'options introuvable.", 404);

    const group = await prisma.$transaction(async (tx) => {
      await tx.optionChoice.deleteMany({ where: { optionGroupId: id } });
      return tx.optionGroup.update({
        where: { id },
        data: {
          name: parsed.data.name,
          type: parsed.data.type,
          required: parsed.data.required,
          minSelections: parsed.data.minSelections,
          maxSelections: parsed.data.maxSelections,
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
    });
    await audit({
      actorId: auth.user.id,
      action: "option_group.updated",
      entityType: "option_group",
      entityId: id,
      details: { name: group.name, choices: group.choices.length },
    });
    publish({ type: "menu.updated" });
    return json({ optionGroup: group });
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
    const group = await prisma.optionGroup.findUnique({ where: { id } });
    if (!group) return apiError("Groupe d'options introuvable.", 404);

    await prisma.optionGroup.delete({ where: { id } });
    await audit({
      actorId: auth.user.id,
      action: "option_group.deleted",
      entityType: "option_group",
      entityId: id,
      details: { name: group.name },
    });
    publish({ type: "menu.updated" });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
