import { describe, expect, it } from "vitest";
import { canTransition } from "../src/lib/transitions";

describe("canTransition", () => {
  it("autorise le parcours nominal", () => {
    expect(canTransition("submitted", "in_progress")).toBe(true);
    expect(canTransition("in_progress", "ready")).toBe(true);
    expect(canTransition("ready", "completed")).toBe(true);
  });

  it("autorise l'annulation avant encaissement", () => {
    expect(canTransition("submitted", "cancelled")).toBe(true);
    expect(canTransition("in_progress", "cancelled")).toBe(true);
    expect(canTransition("ready", "cancelled")).toBe(true);
  });

  it("interdit les sauts et la modification d'une commande terminée", () => {
    expect(canTransition("submitted", "ready")).toBe(false);
    expect(canTransition("submitted", "completed")).toBe(false);
    expect(canTransition("completed", "cancelled")).toBe(false);
    expect(canTransition("cancelled", "submitted")).toBe(false);
  });

  it("refuse un statut inconnu", () => {
    expect(canTransition("unknown", "ready")).toBe(false);
  });
});
