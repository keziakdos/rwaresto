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
import { hashPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  displayName: z.string().trim().min(2).max(60).optional(),
  role: z.enum(["admin", "cashier"]).optional(),
  active: z.boolean().optional(),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(200)
    .regex(/[A-Za-z]/, "Ajoutez au moins une lettre.")
    .regex(/[0-9]/, "Ajoutez au moins un chiffre.")
    .optional(),
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
    const parsed = await readJson(request, patchSchema);
    if (!parsed.ok) return parsed.response;

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return apiError("Utilisateur introuvable.", 404);

    const removesAdmin =
      target.role === "admin" &&
      ((parsed.data.role !== undefined && parsed.data.role !== "admin") ||
        parsed.data.active === false);
    if (removesAdmin) {
      const admins = await prisma.user.count({
        where: { role: "admin", active: true, NOT: { id } },
      });
      if (admins === 0) {
        return apiError("Impossible de retirer le dernier administrateur actif.", 409);
      }
    }
    if (id === auth.user.id && parsed.data.active === false) {
      return apiError("Vous ne pouvez pas désactiver votre propre compte.", 409);
    }

    const data: Record<string, unknown> = {};
    if (parsed.data.displayName !== undefined) data.displayName = parsed.data.displayName;
    if (parsed.data.role !== undefined) data.role = parsed.data.role;
    if (parsed.data.active !== undefined) data.active = parsed.data.active;
    if (parsed.data.password) {
      data.passwordHash = await hashPassword(parsed.data.password);
      data.mustChangePassword = true;
      data.sessionVersion = { increment: 1 };
    }
    if (parsed.data.active === false) data.sessionVersion = { increment: 1 };

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        displayName: true,
        role: true,
        active: true,
        mustChangePassword: true,
        createdAt: true,
      },
    });
    await audit({
      actorId: auth.user.id,
      action: parsed.data.password ? "user.password_reset" : "user.updated",
      entityType: "user",
      entityId: id,
      details: {
        fields: Object.keys(parsed.data),
        displayName: user.displayName,
        role: user.role,
        active: user.active,
      },
    });
    return json({ user });
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
    if (id === auth.user.id) return apiError("Vous ne pouvez pas supprimer votre compte.", 409);

    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) return apiError("Utilisateur introuvable.", 404);
    if (target.role === "admin") {
      const admins = await prisma.user.count({
        where: { role: "admin", active: true, NOT: { id } },
      });
      if (admins === 0) {
        return apiError("Impossible de supprimer le dernier administrateur actif.", 409);
      }
    }

    await prisma.user.delete({ where: { id } });
    await audit({
      actorId: auth.user.id,
      action: "user.deleted",
      entityType: "user",
      entityId: id,
      details: { username: target.username, displayName: target.displayName },
    });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
