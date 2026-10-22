import { prisma } from "./db";

export async function audit(input: {
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  details?: unknown;
  orderId?: string | null;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: input.actorId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId ?? null,
        details: input.details ? JSON.stringify(input.details).slice(0, 4000) : null,
        orderId: input.orderId ?? null,
      },
    });
  } catch (error) {
    console.error("Audit log impossible", error);
  }
}
