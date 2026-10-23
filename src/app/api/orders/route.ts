import { z } from "zod";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import {
  apiError,
  assertSameOrigin,
  getClientIp,
  handleApiError,
  json,
  readJson,
} from "@/lib/api";
import { getSettings, getOpenState, isWithinWindow } from "@/lib/settings";
import { calculateOrderTotals, type PricingProduct } from "@/lib/pricing";
import { normalizeName } from "@/lib/normalize";
import { ACTIVE_STATUSES } from "@/lib/constants";
import { createOrderNumber } from "@/lib/orders";
import { rateLimit } from "@/lib/rate-limit";
import { publish } from "@/lib/realtime";
import { audit } from "@/lib/audit";

export const dynamic = "force-dynamic";

const orderSchema = z.object({
  mode: z.enum(["dine_in", "takeaway"]),
  tableNumber: z.number().int().positive().nullable().optional(),
  customerName: z
    .string()
    .trim()
    .min(1, "Indiquez votre prénom ou pseudo.")
    .max(30, "Le pseudo est limité à 30 caractères."),
  phone: z
    .string()
    .trim()
    .max(25)
    .regex(/^[+0-9 ().-]*$/, "Numéro de téléphone invalide.")
    .optional()
    .or(z.literal("")),
  note: z.string().trim().max(500).optional().or(z.literal("")),
  clientId: z.string().trim().min(8).max(80),
  idempotencyKey: z.string().trim().min(8).max(100),
  items: z
    .array(
      z.object({
        productId: z.string().min(1),
        quantity: z.number().int().min(1).max(20),
        choiceIds: z.array(z.string()).max(20).default([]),
        note: z.string().trim().max(300).optional().or(z.literal("")),
      }),
    )
    .min(1, "Votre panier est vide.")
    .max(40),
});

export async function POST(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const parsed = await readJson(request, orderSchema);
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;

    const existing = await prisma.order.findUnique({
      where: { idempotencyKey: body.idempotencyKey },
      select: { id: true, publicToken: true, orderNumber: true },
    });
    if (existing) {
      return json({ ...existing, duplicate: true });
    }

    const ip = getClientIp(request);
    const limit = rateLimit(
      `order:${ip}`,
      Number(process.env.ORDER_RATE_LIMIT || 8),
      Number(process.env.ORDER_RATE_WINDOW_SECONDS || 60),
    );
    if (!limit.allowed) {
      return json(
        {
          error: "Trop de commandes envoyées. Merci de patienter une minute.",
          retryAfter: limit.retryAfter,
        },
        429,
      );
    }

    const settings = await getSettings();
    const openState = getOpenState(settings);
    if (!openState.isOpen) return json({ error: openState.reason, code: "CLOSED" }, 409);

    if (body.mode === "dine_in") {
      if (!body.tableNumber) return apiError("Indiquez votre numéro de table.", 422);
      const table = await prisma.diningTable.findUnique({
        where: { number: body.tableNumber },
      });
      if (!table || !table.active) {
        return json({ error: "Ce numéro de table n'existe pas.", code: "INVALID_TABLE" }, 422);
      }
    }

    const customerName = body.customerName.trim();
    const normalized = normalizeName(customerName);
    if (!normalized) return apiError("Indiquez votre prénom ou pseudo.", 422);

    if (body.mode === "dine_in" && body.tableNumber) {
      const collision = await prisma.order.findFirst({
        where: {
          tableNumber: body.tableNumber,
          customerNameNormalized: normalized,
          status: { in: ACTIVE_STATUSES },
          NOT: { clientId: body.clientId },
        },
        select: { id: true },
      });
      if (collision) {
        return json(
          {
            error: "Ce pseudo est déjà pris à cette table, choisissez-en un autre.",
            code: "PSEUDO_TAKEN",
          },
          409,
        );
      }
    }

    const productIds = [...new Set(body.items.map((item) => item.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      include: {
        category: true,
        optionGroups: {
          include: {
            optionGroup: { include: { choices: true } },
          },
        },
      },
    });

    const unavailableAtThisTime = products.find(
      (product) =>
        !isWithinWindow(product.category.availableFrom, product.category.availableTo),
    );
    if (unavailableAtThisTime) {
      return json(
        {
          error: `« ${unavailableAtThisTime.name} » n'est pas disponible à cette heure. Le petit-déjeuner est servi de 9h à 11h, la carte complète à partir de 11h.`,
          code: "OUTSIDE_SERVICE",
        },
        409,
      );
    }

    const pricingProducts: PricingProduct[] = products.map((product) => ({
      id: product.id,
      name: product.name,
      priceCents: product.priceCents,
      available: product.available,
      hidden: product.hidden,
      archived: product.archived,
      optionGroups: product.optionGroups.map(({ optionGroup }) => ({
        id: optionGroup.id,
        name: optionGroup.name,
        type: optionGroup.type,
        required: optionGroup.required,
        minSelections: optionGroup.minSelections,
        maxSelections: optionGroup.maxSelections,
        choices: optionGroup.choices.map((choice) => ({
          id: choice.id,
          name: choice.name,
          priceDeltaCents: choice.priceDeltaCents,
          available: choice.available,
        })),
      })),
    }));

    const totals = calculateOrderTotals(
      pricingProducts,
      body.items.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        choiceIds: item.choiceIds || [],
        note: item.note || null,
      })),
    );
    if (!totals.ok) {
      return json({ error: totals.error, code: "UNAVAILABLE" }, 409);
    }

    let createAttempts = 0;
    let order:
      | { id: string; publicToken: string; orderNumber: string; status: string }
      | undefined;

    while (!order && createAttempts < 5) {
      try {
        const { orderNumber, dayKey } = await createOrderNumber();
        order = await prisma.order.create({
          data: {
            orderNumber,
            dayKey,
            status: "submitted",
            mode: body.mode,
            tableNumber: body.mode === "dine_in" ? body.tableNumber : null,
            customerName,
            customerNameNormalized: normalized,
            phone: body.phone?.trim() || null,
            note: body.note?.trim() || null,
            clientId: body.clientId,
            idempotencyKey: body.idempotencyKey,
            subtotalCents: totals.subtotalCents,
            totalCents: totals.totalCents,
            items: {
              create: totals.lines.map((line) => ({
                productId: line.productId,
                nameSnapshot: line.name,
                unitPriceCents: line.unitPriceCents,
                quantity: line.quantity,
                note: line.note,
                lineTotalCents: line.lineTotalCents,
                options: {
                  create: line.options.map((option) => ({
                    groupNameSnapshot: option.groupName,
                    choiceNameSnapshot: option.choiceName,
                    priceDeltaCents: option.priceDeltaCents,
                  })),
                },
              })),
            },
          },
          select: { id: true, publicToken: true, orderNumber: true, status: true },
        });
      } catch (error) {
        const code = (error as { code?: string }).code;
        if (code === "P2002") {
          const duplicate = await prisma.order.findUnique({
            where: { idempotencyKey: body.idempotencyKey },
            select: { id: true, publicToken: true, orderNumber: true, status: true },
          });
          if (duplicate) {
            order = duplicate;
            break;
          }
          createAttempts += 1;
          continue;
        }
        throw error;
      }
    }

    if (!order) return apiError("Impossible de créer la commande, réessayez.", 503);

    await audit({
      action: "order.created",
      entityType: "order",
      entityId: order.id,
      orderId: order.id,
      details: { totalCents: totals.totalCents, itemCount: totals.lines.length, mode: body.mode },
    });

    publish({
      type: "order.created",
      orderId: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      tableNumber: body.mode === "dine_in" ? body.tableNumber ?? null : null,
      customerName,
    });

    return json(order, 201);
  } catch (error) {
    return handleApiError(error);
  }
}
