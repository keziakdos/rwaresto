export function formatMoney(cents: number, currency = "EUR", locale = "fr-FR"): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`;
  }
}

export function formatTime(value: string | Date, locale = "fr-FR"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function formatDateTime(value: string | Date, locale = "fr-FR"): string {
  const date = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat(locale, {
    dateStyle: "short",
    timeStyle: "short",
  }).format(date);
}

export function timeAgo(value: string | Date, now = Date.now()): string {
  const timestamp = typeof value === "string" ? new Date(value).getTime() : value.getTime();
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return "à l'instant";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h`;
  return `${Math.floor(hours / 24)} j`;
}

export function dayKey(date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}
