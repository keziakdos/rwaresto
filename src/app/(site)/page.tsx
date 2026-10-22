import { prisma } from "@/lib/db";
import { HomeExperience } from "@/components/home-experience";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const rawTable = params.table;
  const tableNumber = rawTable && /^\d+$/.test(rawTable) ? Number(rawTable) : null;

  let validTable: number | null = null;
  let invalidTable = false;
  if (tableNumber) {
    const table = await prisma.diningTable.findUnique({ where: { number: tableNumber } });
    if (table?.active) validTable = table.number;
    else invalidTable = true;
  } else if (rawTable) {
    invalidTable = true;
  }

  return (
    <HomeExperience
      initialTable={validTable}
      initialMode={params.mode === "takeaway" ? "takeaway" : "dine_in"}
      invalidTable={invalidTable}
    />
  );
}
