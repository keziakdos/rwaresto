import { prisma } from "./db";
import { dayKey } from "./format";

export async function nextOrderNumber(): Promise<{ orderNumber: string; dayKey: string }> {
  const key = dayKey();
  const count = await prisma.order.count({ where: { dayKey: key } });
  return {
    orderNumber: `A-${String(count + 1).padStart(3, "0")}`,
    dayKey: key,
  };
}

export async function createOrderNumber(): Promise<{ orderNumber: string; dayKey: string }> {
  let lastError: unknown;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const candidate = await nextOrderNumber();
    if (attempt > 0) {
      candidate.orderNumber = `A-${String(Number(candidate.orderNumber.slice(2)) + attempt).padStart(3, "0")}`;
    }
    const exists = await prisma.order.findUnique({
      where: {
        dayKey_orderNumber: {
          dayKey: candidate.dayKey,
          orderNumber: candidate.orderNumber,
        },
      },
      select: { id: true },
    });
    if (!exists) return candidate;
    lastError = new Error("Numéro de commande déjà utilisé.");
  }
  throw lastError ?? new Error("Impossible de générer un numéro de commande.");
}
