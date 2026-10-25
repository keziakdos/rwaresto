import Link from "next/link";
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  CreditCard,
  Flame,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/page-auth";
import { getPublicConfig } from "@/lib/settings";
import { dayKey, formatMoney } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Statistiques" };

const RANGES = [
  { value: 7, label: "7 jours" },
  { value: 30, label: "30 jours" },
  { value: 90, label: "90 jours" },
];

function parisHour(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    hour: "2-digit",
    hourCycle: "h23",
  }).format(date);
}

function shortDay(key: string) {
  return new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
    new Date(`${key}T12:00:00Z`),
  );
}

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const range = RANGES.some((item) => String(item.value) === params.range)
    ? Number(params.range)
    : 30;
  const site = await getPublicConfig();

  const startAt = new Date();
  startAt.setUTCHours(12, 0, 0, 0);
  startAt.setUTCDate(startAt.getUTCDate() - (range - 1));
  const dayKeys = Array.from({ length: range }, (_, index) => {
    const date = new Date(startAt);
    date.setUTCDate(startAt.getUTCDate() + index);
    return dayKey(date);
  });
  const firstDay = dayKeys[0];

  const [orders, products] = await Promise.all([
    prisma.order.findMany({
      where: { dayKey: { gte: firstDay } },
      orderBy: { submittedAt: "asc" },
      include: { items: true },
    }),
    prisma.product.findMany({
      select: { id: true, category: { select: { name: true } } },
    }),
  ]);

  const categoryByProduct = new Map(products.map((product) => [product.id, product.category.name]));
  const completed = orders.filter((order) => order.status === "completed");
  const cancelled = orders.filter((order) => order.status === "cancelled");
  const revenue = completed.reduce((sum, order) => sum + order.totalCents, 0);
  const average = completed.length ? Math.round(revenue / completed.length) : 0;
  const cancellationRate = orders.length ? Math.round((cancelled.length / orders.length) * 100) : 0;

  const daily = new Map(dayKeys.map((key) => [key, { revenue: 0, orders: 0 }]));
  for (const order of completed) {
    const entry = daily.get(order.dayKey);
    if (!entry) continue;
    entry.revenue += order.totalCents;
    entry.orders += 1;
  }
  const dailyValues = dayKeys.map((key) => ({ key, ...daily.get(key)! }));
  const maxDailyRevenue = Math.max(1, ...dailyValues.map((item) => item.revenue));

  const productTotals = new Map<string, { name: string; quantity: number; revenue: number }>();
  const categoryTotals = new Map<string, number>();
  for (const order of completed) {
    for (const item of order.items) {
      const current = productTotals.get(item.nameSnapshot) || {
        name: item.nameSnapshot,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.lineTotalCents;
      productTotals.set(item.nameSnapshot, current);
      const categoryName = (item.productId && categoryByProduct.get(item.productId)) || "Autres";
      categoryTotals.set(categoryName, (categoryTotals.get(categoryName) || 0) + item.lineTotalCents);
    }
  }
  const topProducts = [...productTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 6);
  const maxQuantity = Math.max(1, ...topProducts.map((item) => item.quantity));
  const topCategories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxCategoryRevenue = Math.max(1, ...topCategories.map(([, value]) => value));

  const hours = new Map<string, number>();
  for (const order of orders) {
    const hour = parisHour(order.submittedAt);
    hours.set(hour, (hours.get(hour) || 0) + 1);
  }
  const peakHours = [...hours.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const maxHourCount = Math.max(1, ...peakHours.map(([, value]) => value));

  const payment = completed.reduce(
    (acc, order) => {
      if (order.paymentMethod === "card") acc.card += 1;
      else if (order.paymentMethod === "cash") acc.cash += 1;
      return acc;
    },
    { cash: 0, card: 0 },
  );
  const paymentTotal = Math.max(1, payment.cash + payment.card);
  const modes = completed.reduce(
    (acc, order) => {
      if (order.mode === "takeaway") acc.takeaway += 1;
      else acc.dine_in += 1;
      return acc;
    },
    { dine_in: 0, takeaway: 0 },
  );
  const modeTotal = Math.max(1, modes.dine_in + modes.takeaway);

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" />
            Pilotage
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Les chiffres du service.
          </h1>
          <p className="mt-1.5 text-sm text-muted">Ventes, produits et rythme des commandes sur la période.</p>
        </div>
        <div className="flex rounded-full border border-line/70 bg-surface p-1 shadow-card">
          {RANGES.map((item) => (
            <Link
              key={item.value}
              href={`/admin/stats?range=${item.value}`}
              className={`rounded-full px-3.5 py-2 text-xs font-extrabold transition ${
                range === item.value ? "bg-forest text-white shadow-card" : "text-muted hover:text-ink"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          { label: "CA encaissé", value: formatMoney(revenue, site.currency), hint: `${completed.length} commande${completed.length > 1 ? "s" : ""} payée${completed.length > 1 ? "s" : ""}`, icon: TrendingUp, tone: "bg-brand-soft text-brand-dark" },
          { label: "Ticket moyen", value: formatMoney(average, site.currency), hint: "sur les commandes payées", icon: ShoppingBag, tone: "bg-amber-100 text-amber-900" },
          { label: "Commandes", value: String(orders.length), hint: `${cancelled.length} annulée${cancelled.length > 1 ? "s" : ""}`, icon: CalendarRange, tone: "bg-sky-100 text-sky-900" },
          { label: "Taux d'annulation", value: `${cancellationRate}%`, hint: "sur la période", icon: XCircle, tone: cancellationRate > 10 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-900" },
        ].map((card) => (
          <div key={card.label} className="relative overflow-hidden rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
            <div className="flex items-start justify-between gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </span>
              {card.label === "CA encaissé" ? <ArrowUpRight className="h-4 w-4 text-brand" /> : null}
            </div>
            <p className="mt-5 font-display text-3xl font-semibold leading-none text-ink">{card.value}</p>
            <p className="mt-2 text-[11px] font-extrabold text-muted">{card.label}</p>
            <p className="mt-0.5 text-[10px] font-medium text-muted/70">{card.hint}</p>
          </div>
        ))}
      </div>

      <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Chiffre d&apos;affaires</h2>
            <p className="text-[11px] font-medium text-muted">Encaissements par jour sur {range} jours.</p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-extrabold text-brand-dark">
            <TrendingUp className="h-3 w-3" />
            {formatMoney(revenue, site.currency)}
          </span>
        </div>
        <div className="mt-5 overflow-x-auto pb-2">
          <div className="flex h-48 min-w-[520px] items-end gap-1.5 sm:min-w-0">
            {dailyValues.map((item) => {
              const height = item.revenue ? Math.max(6, Math.round((item.revenue / maxDailyRevenue) * 100)) : 2;
              return (
                <div key={item.key} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-36 w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition ${item.revenue ? "bg-gradient-to-t from-brand to-[#e6a073]" : "bg-line/70"}`}
                      style={{ height: `${height}%` }}
                      title={`${shortDay(item.key)} · ${formatMoney(item.revenue, site.currency)} · ${item.orders} commande${item.orders > 1 ? "s" : ""}`}
                    />
                  </div>
                  <span className="truncate text-[8px] font-bold text-muted/70">{shortDay(item.key)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.2fr_.8fr]">
        <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Top produits</h2>
              <p className="text-[11px] font-medium text-muted">Les plats qui font le service.</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
              <Flame className="h-4 w-4" />
            </span>
          </div>
          {topProducts.length ? (
            <div className="mt-5 space-y-4">
              {topProducts.map((product, index) => (
                <div key={product.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-extrabold text-ink">
                      <span className="mr-1.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-sand text-[9px] text-muted">{index + 1}</span>
                      {product.name}
                    </p>
                    <p className="shrink-0 text-[10px] font-bold text-muted">{product.quantity} vendus · {formatMoney(product.revenue, site.currency)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full bg-gradient-to-r from-brand to-gold" style={{ width: `${Math.max(8, (product.quantity / maxQuantity) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-line p-6 text-center text-sm font-semibold text-muted">Pas encore de ventes sur la période.</p>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Par catégorie</h2>
              <p className="text-[11px] font-medium text-muted">Répartition du chiffre d&apos;affaires.</p>
            </div>
            <ArrowDownRight className="h-4 w-4 text-brand" />
          </div>
          {topCategories.length ? (
            <div className="mt-5 space-y-4">
              {topCategories.map(([name, value]) => (
                <div key={name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-extrabold text-ink">{name}</p>
                    <p className="text-[10px] font-bold text-muted">{formatMoney(value, site.currency)}</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full bg-forest" style={{ width: `${Math.max(8, (value / maxCategoryRevenue) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 rounded-2xl border border-dashed border-line p-6 text-center text-sm font-semibold text-muted">Aucune donnée catégorie.</p>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold text-ink">Heures de pointe</h2>
          <p className="text-[11px] font-medium text-muted">Quand vos clients commandent.</p>
          {peakHours.length ? (
            <div className="mt-5 space-y-3">
              {peakHours.map(([hour, count]) => (
                <div key={hour} className="flex items-center gap-2">
                  <span className="w-12 text-[10px] font-extrabold text-muted">{hour}h</span>
                  <div className="h-2 flex-1 overflow-hidden rounded-full bg-sand">
                    <div className="h-full rounded-full bg-gold" style={{ width: `${Math.max(8, (count / maxHourCount) * 100)}%` }} />
                  </div>
                  <span className="w-6 text-right text-[10px] font-bold text-ink">{count}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Pas encore de commandes.</p>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold text-ink">Paiements</h2>
          <p className="text-[11px] font-medium text-muted">Répartition des encaissements.</p>
          <div className="mt-5 space-y-4">
            {[
              { label: "Espèces", value: payment.cash, icon: Wallet, tone: "bg-emerald-100 text-emerald-900" },
              { label: "Carte", value: payment.card, icon: CreditCard, tone: "bg-sky-100 text-sky-900" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.tone}`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </span>
                  <span className="text-[10px] font-bold text-muted">{item.value} / {paymentTotal}</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className={`h-full rounded-full ${item.label === "Carte" ? "bg-sky-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(3, (item.value / paymentTotal) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
          <h2 className="font-display text-xl font-semibold text-ink">Sur place / à emporter</h2>
          <p className="text-[11px] font-medium text-muted">Le mix de votre service.</p>
          <div className="mt-5 space-y-4">
            {[
              { label: "Sur place", value: modes.dine_in, color: "bg-forest" },
              { label: "À emporter", value: modes.takeaway, color: "bg-brand" },
            ].map((item) => (
              <div key={item.label}>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-extrabold text-ink">{item.label}</span>
                  <span className="text-[10px] font-bold text-muted">{Math.round((item.value / modeTotal) * 100)}%</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className={`h-full rounded-full ${item.color}`} style={{ width: `${Math.max(3, (item.value / modeTotal) * 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
