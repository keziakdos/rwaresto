import { NextRequest } from "next/server";
import { apiError, handleApiError, json } from "@/lib/api";
import { getRequestUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const user = await getRequestUser(request);
    if (!user) return apiError("Non authentifié.", 401);
    return json({ user });
  } catch (error) {
    return handleApiError(error);
  }
}
