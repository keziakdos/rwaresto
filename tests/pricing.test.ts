import { describe, expect, it } from "vitest";
import {
  calculateOrderTotals,
  type PricingProduct,
} from "../src/lib/pricing";

const product: PricingProduct = {
  id: "p1",
  name: "Poulet braisé",
  priceCents: 1200,
  available: true,
  hidden: false,
  archived: false,
  optionGroups: [
    {
      id: "g1",
      name: "Accompagnement",
      type: "single",
      required: true,
      minSelections: 1,
      maxSelections: 1,
      choices: [
        { id: "c1", name: "Riz", priceDeltaCents: 0, available: true },
        { id: "c2", name: "Frites", priceDeltaCents: 200, available: true },
      ],
    },
    {
      id: "g2",
      name: "Extras",
      type: "multiple",
      required: false,
      minSelections: 0,
      maxSelections: 2,
      choices: [
        { id: "c3", name: "Sauce piquante", priceDeltaCents: 100, available: true },
        { id: "c4", name: "Avocat", priceDeltaCents: 150, available: false },
      ],
    },
  ],
};

describe("calculateOrderTotals", () => {
  it("calcule le total de base sans option", () => {
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 2, choiceIds: ["c1"] },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].unitPriceCents).toBe(1200);
    expect(result.subtotalCents).toBe(2400);
    expect(result.totalCents).toBe(2400);
  });

  it("ajoute les suppléments au prix unitaire", () => {
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 1, choiceIds: ["c2", "c3"] },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].unitPriceCents).toBe(1500);
    expect(result.lines[0].options).toHaveLength(2);
  });

  it("refuse un groupe obligatoire vide", () => {
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 1, choiceIds: [] },
    ]);
    expect(result.ok).toBe(false);
  });

  it("refuse une option indisponible", () => {
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 1, choiceIds: ["c1", "c4"] },
    ]);
    expect(result.ok).toBe(false);
  });

  it("refuse une option incompatible avec le produit", () => {
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 1, choiceIds: ["c1", "inconnu"] },
    ]);
    expect(result.ok).toBe(false);
  });

  it("refuse un produit masqué ou épuisé", () => {
    const hidden = calculateOrderTotals([{ ...product, hidden: true }], [
      { productId: "p1", quantity: 1, choiceIds: ["c1"] },
    ]);
    expect(hidden.ok).toBe(false);

    const unavailable = calculateOrderTotals([{ ...product, available: false }], [
      { productId: "p1", quantity: 1, choiceIds: ["c1"] },
    ]);
    expect(unavailable.ok).toBe(false);
  });

  it("refuse un panier vide et les quantités invalides", () => {
    expect(calculateOrderTotals([product], []).ok).toBe(false);
    expect(
      calculateOrderTotals([product], [
        { productId: "p1", quantity: 0, choiceIds: ["c1"] },
      ]).ok,
    ).toBe(false);
    expect(
      calculateOrderTotals([product], [
        { productId: "p1", quantity: 21, choiceIds: ["c1"] },
      ]).ok,
    ).toBe(false);
  });

  it("refuse la sélection en double d'une option", () => {
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 1, choiceIds: ["c1", "c1"] },
    ]);
    expect(result.ok).toBe(false);
  });

  it("nettoie la note et la limite à 300 caractères", () => {
    const long = "a".repeat(400);
    const result = calculateOrderTotals([product], [
      { productId: "p1", quantity: 1, choiceIds: ["c1"], note: `  ${long}  ` },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.lines[0].note).toHaveLength(300);
  });
});
