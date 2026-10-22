import { z } from "zod";
import { NextRequest } from "next/server";
import {
  apiError,
  assertSameOrigin,
  handleApiError,
  json,
  readJson,
} from "@/lib/api";
import { apiRequireRole } from "@/lib/admin-guard";
import { getSettings, updateSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
import { publish } from "@/lib/realtime";

export const dynamic = "force-dynamic";

const optionalText = (max = 200) => z.string().trim().max(max).optional();
const schema = z.object({
  restaurantName: z.string().trim().min(2).max(80).optional(),
  tagline: optionalText(160),
  welcomeMessage: optionalText(500),
  currency: z.string().trim().toUpperCase().regex(/^[A-Z]{3}$/, "Devise ISO invalide.").optional(),
  logoUrl: optionalText(500),
  primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.").optional(),
  accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Couleur invalide.").optional(),
  openTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.").optional(),
  closeTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Heure invalide.").optional(),
  closedDays: z.string().regex(/^(\s*[0-6]\s*(,\s*[0-6]\s*)*)?$/, "Jours invalides.").optional(),
  manualOpen: z.enum(["true", "false"]).optional(),
  address: optionalText(200),
  phone: optionalText(30),
  hoursText: optionalText(200),
});

export async function GET(request: NextRequest) {
  try {
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const settings = await getSettings();
    const publicValues = Object.fromEntries(
      Object.entries(settings).filter(([key]) => key !== "demoCatalogSeeded"),
    );
    return json({ settings: publicValues });
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    if (!assertSameOrigin(request)) return apiError("Requête refusée.", 403);
    const auth = await apiRequireRole(request, ["admin"]);
    if ("response" in auth) return auth.response;
    const parsed = await readJson(request, schema);
    if (!parsed.ok) return parsed.response;

    await updateSettings(parsed.data);
    await audit({
      actorId: auth.user.id,
      action: "settings.updated",
      entityType: "settings",
      details: parsed.data,
    });
    publish({ type: "settings.updated" });
    publish({ type: "menu.updated" });
    return json({ settings: await getSettings() });
  } catch (error) {
    return handleApiError(error);
  }
}
