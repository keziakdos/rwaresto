import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { apiError, assertSameOrigin, getClientIp, handleApiError, json, readJson } from "@/lib/api";
import { rateLimit, resetRateLimit } from "@/lib/rate-limit";
import { setSessionCookie, verifyPassword } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  username: z.string().trim().min(1, "Identifiant requis.").max(60),
  password: z.string().min(1, "Mot de passe requis.").max(200),
});

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    const ip = getClientIp(request);
    const key = `login:${ip}:${parsed.data.username.toLowerCase()}`;
    const limit = rateLimit(key, 6, 15 * 60);
    if (!limit.allowed) {
      return apiError(
        `Trop de tentatives. Réessayez dans ${Math.ceil(limit.retryAfter / 60)} minute(s).`,
        429,
      );
    }

    const user = await prisma.user.findUnique({
      where: { username: parsed.data.username.toLowerCase().trim() },
    });
    if (!user || !user.active || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      await audit({
        action: "auth.login_failed",
        entityType: "user",
        entityId: user?.id,
        details: { username: parsed.data.username, ip },
      });
      return apiError("Identifiant ou mot de passe incorrect.", 401);
    }

    resetRateLimit(key);
    await setSessionCookie(user);
    await audit({
      actorId: user.id,
      action: "auth.login",
      entityType: "user",
      entityId: user.id,
      details: { ip },
    });

    return json({
      user: {
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
    });
  } catch (error) {
    return handleApiError(error);
  }
}
