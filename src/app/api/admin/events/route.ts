import { NextRequest } from "next/server";
import { getRequestUser } from "@/lib/auth";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const user = await getRequestUser(request);
  if (!user) return new Response("Non autorisé", { status: 401 });
  return sseResponse(request);
}
