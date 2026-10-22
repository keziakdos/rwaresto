import { handleApiError, json } from "@/lib/api";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tables = await prisma.diningTable.findMany({
      where: { active: true },
      orderBy: { number: "asc" },
      select: { number: true, label: true },
    });
    return json({ tables });
  } catch (error) {
    return handleApiError(error);
  }
}
