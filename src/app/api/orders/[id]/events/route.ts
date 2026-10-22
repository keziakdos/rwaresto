import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { sseResponse } from "@/lib/realtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");
  if (!token) return new Response("Non autorisé", { status: 401 });

  const order = await prisma.order.findFirst({
    where: { id, publicToken: token },
    select: { id: true },
  });
  if (!order) return new Response("Introuvable", { status: 404 });

  return sseResponse(
    request,
    undefined,
    (event) =>
      event.type === "heartbeat" ||
      event.type === "settings.updated" ||
      event.type === "menu.updated" ||
      event.orderId === id,
  );
}
