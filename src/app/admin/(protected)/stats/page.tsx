import Link from "next/link";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  BarChart3,
  CalendarRange,
  CreditCard,
  Flame,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Wallet,
  XCircle,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/page-auth";
import { getPublicConfig } from "@/lib/settings";
import { dayKey, formatMoney } from "@/lib/format";
import { ORDER_STATUS, PAYMENT_METHODS } from "@/lib/constants";

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

function parisDateTime(value: Date) {
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
}

const DETAILS = ["paid", "orders", "cancelled", "cash", "card"] as const;
type Detail = (typeof DETAILS)[number];

export default async function AdminStatsPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; detail?: string }>;
}) {
  await requireAdminPage();
  const params = await searchParams;
  const range = RANGES.some((item) => String(item.value) === params.range)
    ? Number(params.range)
    : 30;
  const detail = DETAILS.includes(params.detail as Detail) ? (params.detail as Detail) : null;
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

  const detailOrders =
    detail === "paid"
      ? [...completed].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
      : detail === "orders"
        ? [...orders].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
        : detail === "cancelled"
          ? [...cancelled].sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime())
          : detail === "cash"
            ? [...completed]
                .filter((order) => order.paymentMethod === "cash")
                .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
            : detail === "card"
              ? [...completed]
                  .filter((order) => order.paymentMethod === "card")
                  .sort((a, b) => (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0))
              : [];
  const detailTitle: Record<Detail, string> = {
    paid: "Commandes payées",
    orders: "Toutes les commandes",
    cancelled: "Commandes annulées",
    cash: "Encaissements en espèces",
    card: "Encaissements par carte",
  };
  const detailTotal = detailOrders.reduce((sum, order) => sum + order.totalCents, 0);

  const chartIsWeekly = range > 30;
  const chartSeries = chartIsWeekly
    ? Array.from({ length: Math.ceil(dailyValues.length / 7) }, (_, index) => {
        const chunk = dailyValues.slice(index * 7, index * 7 + 7);
        const revenue = chunk.reduce((sum, item) => sum + item.revenue, 0);
        const count = chunk.reduce((sum, item) => sum + item.orders, 0);
        const first = chunk[0];
        const last = chunk[chunk.length - 1];
        return {
          key: first.key,
          revenue,
          orders: count,
          label: shortDay(first.key),
          tooltip: `Semaine du ${shortDay(first.key)} au ${shortDay(last.key)} · ${formatMoney(revenue, site.currency)} · ${count} commande${count > 1 ? "s" : ""}`,
        };
      })
    : dailyValues.map((item, index) => ({
        ...item,
        label: range <= 7 || index % 5 === 0 || index === dailyValues.length - 1 ? shortDay(item.key) : "",
        tooltip: `${shortDay(item.key)} · ${formatMoney(item.revenue, site.currency)} · ${item.orders} commande${item.orders > 1 ? "s" : ""}`,
      }));
  const maxChartRevenue = Math.max(1, ...chartSeries.map((item) => item.revenue));

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
          { label: "CA encaissé", value: formatMoney(revenue, site.currency), hint: `${completed.length} commande${completed.length > 1 ? "s" : ""} payée${completed.length > 1 ? "s" : ""}`, icon: TrendingUp, tone: "bg-brand-soft text-brand-dark", detail: "paid" as const },
          { label: "Ticket moyen", value: formatMoney(average, site.currency), hint: "sur les commandes payées", icon: ShoppingBag, tone: "bg-amber-100 text-amber-900", detail: "paid" as const },
          { label: "Commandes", value: String(orders.length), hint: `${cancelled.length} annulée${cancelled.length > 1 ? "s" : ""}`, icon: CalendarRange, tone: "bg-sky-100 text-sky-900", detail: "orders" as const },
          { label: "Taux d'annulation", value: `${cancellationRate}%`, hint: "sur la période", icon: XCircle, tone: cancellationRate > 10 ? "bg-red-100 text-red-800" : "bg-emerald-100 text-emerald-900", detail: "cancelled" as const },
        ].map((card) => (
          <Link
            key={card.label}
            href={`/admin/stats?range=${range}&detail=${card.detail}#details`}
            className="group relative overflow-hidden rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:border-brand/25 hover:shadow-soft"
          >
            <div className="flex items-start justify-between gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-muted/40 transition group-hover:text-brand" />
            </div>
            <p className="mt-5 font-display text-3xl font-semibold leading-none text-ink">{card.value}</p>
            <p className="mt-2 text-[11px] font-extrabold text-muted">{card.label}</p>
            <p className="mt-0.5 flex items-center gap-1 text-[10px] font-medium text-muted/70">
              {card.hint}
              <span className="text-brand opacity-0 transition group-hover:opacity-100">· voir</span>
            </p>
          </Link>
        ))}
      </div>

      {detail ? (
        <section id="details" className="scroll-mt-24 overflow-hidden rounded-[1.5rem] border border-brand/20 bg-surface shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-line/70 bg-cream/50 px-5 py-4">
            <div>
              <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-brand">
                <ReceiptText className="h-3.5 w-3.5" />
                Détail · {range} jours
              </p>
              <h2 className="mt-1 font-display text-2xl font-semibold text-ink">{detailTitle[detail]}</h2>
              <p className="mt-1 text-[11px] font-medium text-muted">
                {detailOrders.length} commande{detailOrders.length > 1 ? "s" : ""} · {formatMoney(detailTotal, site.currency)} cumulés
              </p>
            </div>
            <Link
              href={`/admin/stats?range=${range}`}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-[10px] font-extrabold text-muted transition hover:text-ink"
            >
              Fermer le détail
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left">
              <thead className="border-b border-line/70 bg-sand/35 text-[9px] font-extrabold uppercase tracking-[0.08em] text-muted">
                <tr>
                  <th className="px-4 py-3">Commande</th>
                  <th className="px-3 py-3">Commandée</th>
                  <th className="px-3 py-3">Encaissée</th>
                  <th className="px-3 py-3">Client</th>
                  <th className="px-3 py-3">Service</th>
                  <th className="px-3 py-3">Statut</th>
                  <th className="px-3 py-3">Paiement</th>
                  <th className="px-4 py-3 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/50">
                {detailOrders.map((order) => {
                  const status = ORDER_STATUS[order.status as keyof typeof ORDER_STATUS];
                  return (
                    <tr key={order.id} className="text-xs transition hover:bg-sand/20">
                      <td className="px-4 py-3 font-extrabold text-ink">{order.orderNumber}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold text-muted">{parisDateTime(order.submittedAt)}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold text-muted">
                        {order.completedAt ? parisDateTime(order.completedAt) : "—"}
                      </td>
                      <td className="max-w-[150px] truncate px-3 py-3 font-bold text-ink">{order.customerName}</td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] font-semibold text-muted">
                        {order.mode === "dine_in" ? `Table ${order.tableNumber ?? "—"}` : "À emporter"}
                      </td>
                      <td className="px-3 py-3">
                        <span className={`badge border ${status?.color || "bg-sand text-muted"}`} title={order.cancelReason || undefined}>
                          {status?.label || order.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[11px] font-bold text-muted">
                        {order.paymentMethod ? PAYMENT_METHODS[order.paymentMethod as "cash" | "card"] : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-extrabold text-forest">
                        {formatMoney(order.totalCents, site.currency)}
                      </td>
                    </tr>
                  );
                })}
                {!detailOrders.length ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-10 text-center text-sm font-semibold text-muted">
                      Aucune commande dans cette sélection.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Chiffre d&apos;affaires</h2>
            <p className="text-[11px] font-medium text-muted">
              {chartIsWeekly
                ? `Encaissements par semaine sur ${range} jours.`
                : `Encaissements par jour sur ${range} jours.`}
            </p>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-brand-soft px-2.5 py-1 text-[10px] font-extrabold text-brand-dark">
            <TrendingUp className="h-3 w-3" />
            {formatMoney(revenue, site.currency)}
          </span>
        </div>
        <div className="mt-5 overflow-x-auto pb-2">
          <div className="flex h-48 min-w-[520px] items-end gap-1.5 sm:min-w-0">
            {chartSeries.map((item) => {
              const height = item.revenue ? Math.max(6, Math.round((item.revenue / maxChartRevenue) * 100)) : 2;
              return (
                <div key={item.key} className="group flex min-w-0 flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-36 w-full items-end">
                    <div
                      className={`w-full rounded-t-md transition ${item.revenue ? "bg-gradient-to-t from-brand to-[#e6a073]" : "bg-line/70"}`}
                      style={{ height: `${height}%` }}
                      title={item.tooltip}
                    />
                  </div>
                  <span className="truncate text-[8px] font-bold text-muted/70">{item.label || "\u00a0"}</span>
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
              { label: "Espèces", value: payment.cash, icon: Wallet, tone: "bg-emerald-100 text-emerald-900", detail: "cash" as const },
              { label: "Carte", value: payment.card, icon: CreditCard, tone: "bg-sky-100 text-sky-900", detail: "card" as const },
            ].map((item) => (
              <Link
                key={item.label}
                href={`/admin/stats?range=${range}&detail=${item.detail}#details`}
                className="group -m-2 block rounded-xl p-2 transition hover:bg-sand/40"
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                    <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${item.tone}`}>
                      <item.icon className="h-3.5 w-3.5" />
                    </span>
                    {item.label}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] font-bold text-muted">
                    {item.value} / {paymentTotal}
                    <ArrowRight className="h-3 w-3 opacity-0 transition group-hover:opacity-100" />
                  </span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                  <div className={`h-full rounded-full ${item.label === "Carte" ? "bg-sky-500" : "bg-emerald-500"}`} style={{ width: `${Math.max(3, (item.value / paymentTotal) * 100)}%` }} />
                </div>
              </Link>
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
