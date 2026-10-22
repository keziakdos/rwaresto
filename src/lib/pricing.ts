export type PricingChoice = {
  id: string;
  name: string;
  priceDeltaCents: number;
  available: boolean;
};

export type PricingOptionGroup = {
  id: string;
  name: string;
  type: string;
  required: boolean;
  minSelections: number;
  maxSelections: number;
  choices: PricingChoice[];
};

export type PricingProduct = {
  id: string;
  name: string;
  priceCents: number;
  available: boolean;
  hidden: boolean;
  archived: boolean;
  optionGroups: PricingOptionGroup[];
};

export type PricedLineInput = {
  productId: string;
  quantity: number;
  choiceIds: string[];
  note?: string | null;
};

export type PricedLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  note: string | null;
  options: {
    groupName: string;
    choiceName: string;
    priceDeltaCents: number;
  }[];
};

export type PricingResult =
  | { ok: true; lines: PricedLine[]; subtotalCents: number; totalCents: number }
  | { ok: false; error: string };

export function calculateOrderTotals(
  products: PricingProduct[],
  inputLines: PricedLineInput[],
): PricingResult {
  if (!inputLines.length) return { ok: false, error: "Votre panier est vide." };
  if (inputLines.length > 40) return { ok: false, error: "Trop d'articles dans la commande." };

  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: PricedLine[] = [];

  for (const input of inputLines) {
    const product = byId.get(input.productId);
    if (!product) return { ok: false, error: "Un produit du panier n'existe plus." };
    if (product.archived || product.hidden || !product.available) {
      return { ok: false, error: `« ${product.name} » n'est plus disponible.` };
    }
    if (!Number.isInteger(input.quantity) || input.quantity < 1 || input.quantity > 20) {
      return { ok: false, error: "Quantité invalide." };
    }

    const selected = new Set(input.choiceIds);
    if (selected.size !== input.choiceIds.length) {
      return { ok: false, error: "Une option est sélectionnée plusieurs fois." };
    }

    const groupsById = new Map(product.optionGroups.map((group) => [group.id, group]));
    let delta = 0;
    const selectedOptions: PricedLine["options"] = [];

    for (const group of product.optionGroups) {
      const chosen = group.choices.filter((choice) => selected.has(choice.id));
      if (chosen.length < group.minSelections) {
        return { ok: false, error: `Choisissez une option pour « ${group.name} ».` };
      }
      if (chosen.length > group.maxSelections) {
        return { ok: false, error: `Trop de choix pour « ${group.name} ».` };
      }
      if (group.required && chosen.length === 0) {
        return { ok: false, error: `Le choix « ${group.name} » est obligatoire.` };
      }
      for (const choice of chosen) {
        if (!choice.available) {
          return { ok: false, error: `L'option « ${choice.name} » n'est plus disponible.` };
        }
        delta += choice.priceDeltaCents;
        selectedOptions.push({
          groupName: group.name,
          choiceName: choice.name,
          priceDeltaCents: choice.priceDeltaCents,
        });
      }
    }

    for (const choiceId of selected) {
      const belongs = product.optionGroups.some((group) =>
        group.choices.some((choice) => choice.id === choiceId),
      );
      if (!belongs) return { ok: false, error: "Option incompatible avec ce plat." };
    }

    if (groupsById.size === 0 && selected.size > 0) {
      return { ok: false, error: "Ce produit n'accepte pas d'options." };
    }

    const unitPriceCents = Math.max(0, product.priceCents + delta);
    lines.push({
      productId: product.id,
      name: product.name,
      quantity: input.quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * input.quantity,
      note: input.note?.trim().slice(0, 300) || null,
      options: selectedOptions,
    });
  }

  const subtotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  return { ok: true, lines, subtotalCents, totalCents: subtotalCents };
}
