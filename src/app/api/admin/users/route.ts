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

const createSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "L'identifiant doit contenir au moins 3 caractères.")
    .max(40)
    .regex(/^[a-zA-Z0-9._-]+$/, "Identifiant invalide."),
  displayName: z.string().trim().min(2, "Nom affiché requis.").max(60),
  password: z
    .string()
    .min(8, "Le mot de passe doit contenir au moins 8 caractères.")
    .max(200)
    .regex(/[A-Za-z]/, "Ajoutez au moins une lettre.")
    .regex(/[0-9]/, "Ajoutez au moins un chiffre."),
  role: z.enum(["admin", "cashier"]),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const users = await prisma.user.findMany({
      orderBy: [{ role: "asc" }, { displayName: "asc" }],
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
    return json({ users });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, createSchema);
    if (!parsed.ok) return parsed.response;

    const username = parsed.data.username.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) return apiError("Cet identifiant est déjà utilisé.", 409);

    const user = await prisma.user.create({
      data: {
        username,
        displayName: parsed.data.displayName,
        passwordHash: await hashPassword(parsed.data.password),
        role: parsed.data.role,
        mustChangePassword: true,
      },
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
      action: "user.created",
      entityType: "user",
      entityId: user.id,
      details: { username, role: user.role },
    });
    return json({ user }, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
