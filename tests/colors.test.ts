import { describe, expect, it } from "vitest";
import { darken, hexToRgb, mixWithWhite, rgbChannels, themeVariables } from "../src/lib/colors";

describe("couleurs de thème", () => {
  it("convertit une couleur hexadécimale", () => {
    expect(hexToRgb("#C4512C")).toEqual({ r: 196, g: 81, b: 44 });
    expect(hexToRgb("nope")).toBeNull();
    expect(rgbChannels("#C4512C")).toBe("196 81 44");
  });

  it("éclaircit et assombrit", () => {
    expect(mixWithWhite("#000000", 0.5)).toBe("#808080");
    expect(darken("#FFFFFF", 0.5)).toBe("#808080");
  });

  it("génère les variables personnalisées utilisées par le thème", () => {
    const variables = themeVariables("#C4512C", "#234D3C");
    expect(variables["--site-brand"]).toBe("#C4512C");
    expect(variables["--site-brand-rgb"]).toBe("196 81 44");
    expect(variables["--site-accent"]).toBe("#234D3C");
    expect(variables["--site-accent-rgb"]).toBe("35 77 60");
    expect(variables["--site-brand-bright-rgb"]).toBeDefined();
    expect(variables["--site-accent-bright-rgb"]).toBeDefined();
  });

  it("revient aux couleurs par défaut si la valeur est invalide", () => {
    const variables = themeVariables("invalide", "");
    expect(variables["--site-brand"]).toBe("#C4512C");
    expect(variables["--site-accent"]).toBe("#234D3C");
  });
});
