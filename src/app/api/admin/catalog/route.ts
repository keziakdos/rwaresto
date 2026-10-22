import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { handleApiError, json } from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;

    const [categories, products, optionGroups] = await Promise.all([
      prisma.category.findMany({
        orderBy: { sortOrder: "asc" },
        include: { _count: { select: { products: true } } },
      }),
      prisma.product.findMany({
        orderBy: [{ categoryId: "asc" }, { sortOrder: "asc" }],
        include: {
          category: { select: { id: true, name: true } },
          optionGroups: { select: { optionGroupId: true } },
          _count: { select: { orderItems: true } },
        },
      }),
      prisma.optionGroup.findMany({
        orderBy: { sortOrder: "asc" },
        include: { choices: { orderBy: { sortOrder: "asc" } }, _count: { select: { products: true } } },
      }),
    ]);

    return json({ categories, products, optionGroups });
  } catch (error) {
    return handleApiError(error);
  }
}
