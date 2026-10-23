import { describe, expect, it } from "vitest";
import { getOpenState, isWithinDateRange, isWithinWindow } from "../src/lib/settings";

describe("horaires de service", () => {
  it("gère une plage classique", () => {
    expect(isWithinWindow("09:00", "11:00", new Date("2026-10-23T08:30:00Z"))).toBe(true);
    expect(isWithinWindow("09:00", "11:00", new Date("2026-10-23T09:30:00Z"))).toBe(false);
  });

  it("gère une fermeture après minuit", () => {
    expect(isWithinWindow("11:00", "01:00", new Date("2026-10-23T22:30:00Z"))).toBe(true);
    expect(isWithinWindow("11:00", "01:00", new Date("2026-10-23T23:30:00Z"))).toBe(false);
  });

  it("gère une plage de dates pour un menu spécial", () => {
    expect(isWithinDateRange("2026-02-13", "2026-02-14", new Date("2026-02-13T12:00:00Z"))).toBe(true);
    expect(isWithinDateRange("2026-02-13", "2026-02-14", new Date("2026-02-15T12:00:00Z"))).toBe(false);
    expect(isWithinDateRange("2026-02-13", "2026-02-14", new Date("2026-02-12T12:00:00Z"))).toBe(false);
    expect(isWithinDateRange(null, null, new Date("2026-02-15T12:00:00Z"))).toBe(true);
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

  it("ferme le lundi mais garde le service du dimanche après minuit", () => {
    const settings = {
      openTime: "09:00",
      closeTime: "01:00",
      closedDays: "1",
      manualOpen: "true",
      hoursText: "Du mardi au dimanche · 09h00 – 01h00",
    };
    expect(getOpenState(settings, new Date("2026-10-26T10:30:00Z")).isOpen).toBe(false);
    expect(getOpenState(settings, new Date("2026-10-25T23:30:00Z")).isOpen).toBe(true);
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
