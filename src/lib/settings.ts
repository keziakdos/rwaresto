import { prisma } from "./db";

export type SettingsMap = Record<string, string>;

export const DEFAULT_SETTINGS: SettingsMap = {
  restaurantName: "Rwaresto",
  tagline: "Des bols généreux, des épices qui voyagent.",
  welcomeMessage: "Composez votre bol, installez-vous, et laissez les saveurs faire le reste.",
  currency: process.env.CURRENCY || "EUR",
  logoUrl: "",
  primaryColor: "#C4512C",
  accentColor: "#234D3C",
  openTime: "11:00",
  closeTime: "22:00",
  closedDays: "",
  manualOpen: "true",
  address: "12 place des Saveurs",
  phone: "",
  hoursText: "Tous les jours · 11h00 – 22h00",
};

export async function getSettings(): Promise<SettingsMap> {
  try {
    const rows = await prisma.setting.findMany();
    const values = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    return { ...DEFAULT_SETTINGS, ...values };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function parisParts(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Paris",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

const WEEKDAY_INDEX: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

function toMinutes(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

export function getOpenState(settings: SettingsMap, date = new Date()) {
  if (settings.manualOpen === "false") {
    return {
      isOpen: false,
      reason: "Les commandes sont momentanément fermées. Merci de revenir un peu plus tard.",
    };
  }

  const parts = parisParts(date);
  const weekday = WEEKDAY_INDEX[parts.weekday] ?? 0;
  const closedDays = settings.closedDays
    .split(",")
    .map((day) => Number(day.trim()))
    .filter((day) => Number.isInteger(day));
  if (closedDays.includes(weekday)) {
    return {
      isOpen: false,
      reason: `Le restaurant est fermé aujourd'hui. ${settings.hoursText}`,
    };
  }

  const now = Number(parts.hour) * 60 + Number(parts.minute);
  const open = toMinutes(settings.openTime);
  const close = toMinutes(settings.closeTime);
  if (open === null || close === null) {
    return { isOpen: true, reason: "" };
  }
  const isOpen = close >= open ? now >= open && now < close : now >= open || now < close;
  return {
    isOpen,
    reason: isOpen ? "" : `Le restaurant est fermé. ${settings.hoursText}`,
  };
}

export type PublicConfig = {
  restaurantName: string;
  tagline: string;
  welcomeMessage: string;
  currency: string;
  logoUrl: string;
  primaryColor: string;
  accentColor: string;
  hoursText: string;
  address: string;
  phone: string;
  isOpen: boolean;
  closedReason: string;
  openTime: string;
  closeTime: string;
};

export async function getPublicConfig(): Promise<PublicConfig> {
  const settings = await getSettings();
  const openState = getOpenState(settings);
  return {
    restaurantName: settings.restaurantName,
    tagline: settings.tagline,
    welcomeMessage: settings.welcomeMessage,
    currency: settings.currency || process.env.CURRENCY || "EUR",
    logoUrl: settings.logoUrl,
    primaryColor: settings.primaryColor,
    accentColor: settings.accentColor,
    hoursText: settings.hoursText,
    address: settings.address,
    phone: settings.phone,
    isOpen: openState.isOpen,
    closedReason: openState.reason,
    openTime: settings.openTime,
    closeTime: settings.closeTime,
  };
}

export async function updateSettings(values: SettingsMap, allowedKeys?: string[]) {
  const entries = Object.entries(values).filter(
    ([key, value]) => typeof value === "string" && (!allowedKeys || allowedKeys.includes(key)),
  );
  await prisma.$transaction(
    entries.map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      }),
    ),
  );
}
