import { NextRequest } from "next/server";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { apiRequireRole } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await apiRequireRole(request, ["admin"]);
  if ("response" in auth) return auth.response;
  const { id } = await params;
  const table = await prisma.diningTable.findUnique({ where: { id } });
  if (!table) return new Response("Table introuvable", { status: 404 });

  const base = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");
  const target = `${base}/?table=${table.number}`;
  const format = request.nextUrl.searchParams.get("format") === "svg" ? "svg" : "png";
  const inline = request.nextUrl.searchParams.get("inline") === "1";
  const filename = `rwaresto-table-${table.number}.${format}`;

  if (format === "svg") {
    const svg = await QRCode.toString(target, {
      type: "svg",
      margin: 2,
      width: 900,
      color: { dark: "#1f2b24", light: "#ffffff" },
    });
    return new Response(svg, {
      headers: {
        "Content-Type": "image/svg+xml; charset=utf-8",
        ...(inline ? {} : { "Content-Disposition": `attachment; filename="${filename}"` }),
        "Cache-Control": "no-store",
      },
    });
  }

  const png = await QRCode.toBuffer(target, {
    type: "png",
    margin: 2,
    width: 900,
    color: { dark: "#1f2b24", light: "#ffffff" },
  });
  return new Response(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
