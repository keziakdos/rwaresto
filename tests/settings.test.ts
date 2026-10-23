import { describe, expect, it } from "vitest";
import { getOpenState, isWithinWindow } from "../src/lib/settings";

describe("horaires de service", () => {
  it("gère une plage classique", () => {
    expect(isWithinWindow("09:00", "11:00", new Date("2026-10-23T08:30:00Z"))).toBe(true);
    expect(isWithinWindow("09:00", "11:00", new Date("2026-10-23T09:30:00Z"))).toBe(false);
  });

  it("gère une fermeture après minuit", () => {
    expect(isWithinWindow("11:00", "01:00", new Date("2026-10-23T22:30:00Z"))).toBe(true);
    expect(isWithinWindow("11:00", "01:00", new Date("2026-10-23T23:30:00Z"))).toBe(false);
  });

  it("ouvre de 9h à 1h du matin", () => {
    const settings = {
      openTime: "09:00",
      closeTime: "01:00",
      closedDays: "",
      manualOpen: "true",
      hoursText: "Tous les jours · 09h00 – 01h00",
    };
    expect(getOpenState(settings, new Date("2026-10-23T07:30:00Z")).isOpen).toBe(true);
    expect(getOpenState(settings, new Date("2026-10-22T22:30:00Z")).isOpen).toBe(true);
    expect(getOpenState(settings, new Date("2026-10-23T01:00:00Z")).isOpen).toBe(false);
  });

  it("applique le jour de fermeture au service de la veille après minuit", () => {
    const settings = {
      openTime: "09:00",
      closeTime: "01:00",
      closedDays: "4",
      manualOpen: "true",
      hoursText: "Tous les jours · 09h00 – 01h00",
    };
    expect(getOpenState(settings, new Date("2026-10-22T22:30:00Z")).isOpen).toBe(false);
    expect(getOpenState(settings, new Date("2026-10-23T08:30:00Z")).isOpen).toBe(true);
  });
});
