import { NextRequest } from "next/server";
import { apiError, assertSameOrigin, handleApiError, json } from "@/lib/api";
import { clearSessionCookie, getRequestUser } from "@/lib/auth";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const user = await getRequestUser(request);
    await clearSessionCookie();
    if (user) {
      await audit({
        actorId: user.id,
        action: "auth.logout",
        entityType: "user",
        entityId: user.id,
      });
    }
    return json({ ok: true });
  } catch (error) {
    return handleApiError(error);
  }
}
