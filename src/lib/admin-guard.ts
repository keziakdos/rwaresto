import type { NextRequest } from "next/server";
import { getRequestUser, type SessionUser } from "./auth";
import { apiError } from "./api";

export async function apiRequireRole(
  request: NextRequest,
  roles: SessionUser["role"][] = ["admin"],
): Promise<{ user: SessionUser } | { response: ReturnType<typeof apiError> }> {
  const user = await getRequestUser(request);
  if (!user) return { response: apiError("Non authentifié.", 401) };
  if (!roles.includes(user.role)) return { response: apiError("Accès refusé.", 403) };
  return { user };
}
