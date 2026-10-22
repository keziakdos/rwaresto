import { prisma } from "@/lib/db";
import { MenuExperience } from "@/components/menu-experience";

export const metadata = {
  title: "Le menu",
  description: "Découvrez les bols, assiettes, boissons et desserts. Composez votre commande.",
};

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{ table?: string; mode?: string }>;
}) {
  const params = await searchParams;
  const rawTable = params.table;
  const tableNumber = rawTable && /^\d+$/.test(rawTable) ? Number(rawTable) : null;
  let validTable: number | null = null;

  if (tableNumber) {
    const table = await prisma.diningTable.findUnique({ where: { number: tableNumber } });
    if (table?.active) validTable = table.number;
  }

  return (
    <MenuExperience
      initialMode={params.mode === "takeaway" ? "takeaway" : "dine_in"}
      initialTable={validTable}
    />
  );
}
