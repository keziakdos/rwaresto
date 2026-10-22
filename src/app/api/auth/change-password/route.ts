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
import {
  getRequestUser,
  hashPassword,
  setSessionCookie,
  verifyPassword,
} from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  currentPassword: z.string().min(1, "Mot de passe actuel requis."),
  newPassword: z
    .string()
    .min(8, "Le nouveau mot de passe doit contenir au moins 8 caractères.")
    .max(200)
    .regex(/[A-Za-z]/, "Ajoutez au moins une lettre.")
    .regex(/[0-9]/, "Ajoutez au moins un chiffre."),
});

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const session = await getRequestUser(request);
    if (!session) return apiError("Non authentifié.", 401);

    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    const user = await prisma.user.findUnique({ where: { id: session.id } });
    if (!user) return apiError("Compte introuvable.", 404);
    if (!(await verifyPassword(parsed.data.currentPassword, user.passwordHash))) {
      return apiError("Le mot de passe actuel est incorrect.", 422);
    }
    if (parsed.data.currentPassword === parsed.data.newPassword) {
      return apiError("Choisissez un mot de passe différent.", 422);
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await hashPassword(parsed.data.newPassword),
        mustChangePassword: false,
        sessionVersion: { increment: 1 },
      },
    });
    await setSessionCookie(updated);
    await audit({
      actorId: user.id,
      action: "user.password_changed",
      entityType: "user",
      entityId: user.id,
    });
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
