import { describe, expect, it } from "vitest";
import { normalizeName, slugify } from "../src/lib/normalize";

describe("normalizeName", () => {
  it("ignore la casse et les accents", () => {
    expect(normalizeName("Léa")).toBe(normalizeName("LEA"));
    expect(normalizeName("Ça va")).toBe(normalizeName("ca va"));
  });

  it("réduit les espaces", () => {
    expect(normalizeName("  Jean   Dupont  ")).toBe("jean dupont");
  });
});

describe("slugify", () => {
  it("produit un slug sûr", () => {
    expect(slugify("Poulet braisé & frites")).toBe("poulet-braise-frites");
    expect(slugify("  ÉTÉ 2026 !! ")).toBe("ete-2026");
  });
});
