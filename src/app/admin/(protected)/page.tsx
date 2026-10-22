import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  ClipboardList,
  Download,
  QrCode,
  ShoppingBag,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/page-auth";
import { getPublicConfig } from "@/lib/settings";
import { formatMoney, dayKey } from "@/lib/format";
import { ACTIVE_STATUSES, ORDER_STATUS } from "@/lib/constants";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tableau de bord" };

export default async function AdminDashboardPage() {
  await requireAdminPage();
  const today = dayKey();
  const site = await getPublicConfig();

  const [todayOrders, activeOrders, completedToday, tablesCount, usersCount] = await Promise.all([
    prisma.order.findMany({ where: { dayKey: today }, include: { items: true } }),
    prisma.order.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      orderBy: { submittedAt: "desc" },
      take: 8,
    }),
    prisma.order.findMany({
      where: { dayKey: today, status: "completed" },
      include: { items: true },
    }),
    prisma.diningTable.count({ where: { active: true } }),
    prisma.user.count({ where: { active: true } }),
  ]);

  const revenue = completedToday.reduce((sum, order) => sum + order.totalCents, 0);
  const cancelled = todayOrders.filter((order) => order.status === "cancelled").length;
  const average = completedToday.length ? Math.round(revenue / completedToday.length) : 0;
  const productTotals = new Map<string, { name: string; quantity: number; revenue: number }>();
  for (const order of completedToday) {
    for (const item of order.items) {
      const current = productTotals.get(item.nameSnapshot) || {
        name: item.nameSnapshot,
        quantity: 0,
        revenue: 0,
      };
      current.quantity += item.quantity;
      current.revenue += item.lineTotalCents;
      productTotals.set(item.nameSnapshot, current);
    }
  }
  const topProducts = [...productTotals.values()].sort((a, b) => b.quantity - a.quantity).slice(0, 5);
  const maxQuantity = topProducts[0]?.quantity || 1;

  const cards = [
    {
      label: "CA encaissé aujourd'hui",
      value: formatMoney(revenue, site.currency),
      hint: `${completedToday.length} commande${completedToday.length > 1 ? "s" : ""} payée${completedToday.length > 1 ? "s" : ""}`,
      icon: Banknote,
      color: "bg-emerald-50 text-emerald-700",
    },
    {
      label: "Commandes du jour",
      value: String(todayOrders.length),
      hint: `${cancelled} annulée${cancelled > 1 ? "s" : ""}`,
      icon: ClipboardList,
      color: "bg-sky-50 text-sky-700",
    },
    {
      label: "Ticket moyen",
      value: formatMoney(average, site.currency),
      hint: "sur les commandes payées",
      icon: TrendingUp,
      color: "bg-amber-50 text-amber-700",
    },
    {
      label: "En cours",
      value: String(activeOrders.length),
      hint: "à valider, préparer ou servir",
      icon: ShoppingBag,
      color: "bg-brand-soft text-brand-dark",
    },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Aujourd'hui</p>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Tableau de bord</h1>
          <p className="mt-1 text-sm text-stone-500">
            {site.restaurantName} · {tablesCount} tables actives · {usersCount} comptes actifs
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/admin/orders" className="btn-primary min-h-10 px-4 text-xs">
            Ouvrir la caisse
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/api/admin/export" className="btn-secondary min-h-10 px-3 text-xs">
            <Download className="h-4 w-4" />
            CSV
          </Link>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2.5 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${card.color}`}>
              <card.icon className="h-4 w-4" />
            </span>
            <p className="mt-3 font-display text-2xl font-bold leading-none text-forest">{card.value}</p>
            <p className="mt-1 text-[11px] font-extrabold text-stone-500">{card.label}</p>
            <p className="mt-0.5 text-[10px] font-semibold text-stone-400">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[2fr_1fr]">
        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-forest">Commandes actives</h2>
            <Link href="/admin/orders" className="text-xs font-bold text-brand hover:underline">
              Tout voir
            </Link>
          </div>
          {activeOrders.length ? (
            <div className="mt-2 divide-y divide-black/5">
              {activeOrders.map((order) => (
                <div key={order.id} className="flex items-center gap-2 py-2.5">
                  <span className="w-16 text-xs font-extrabold text-stone-500">{order.orderNumber}</span>
                  <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                    {order.mode === "dine_in" ? `Table ${order.tableNumber}` : "À emporter"} ·{" "}
                    {order.customerName}
                  </span>
                  <span className={`badge border ${ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.color || "bg-stone-100 text-stone-600"}`}>
                    {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.label || order.status}
                  </span>
                  <span className="text-sm font-extrabold text-forest">
                    {formatMoney(order.totalCents, site.currency)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm font-semibold text-stone-400">
              Aucune commande active pour le moment.
            </p>
          )}
        </section>

        <section className="rounded-2xl border border-black/5 bg-white p-4 shadow-card">
          <h2 className="font-display text-lg font-bold text-forest">Top produits du jour</h2>
          {topProducts.length ? (
            <div className="mt-3 space-y-2.5">
              {topProducts.map((product, index) => (
                <div key={product.name}>
                  <div className="flex items-baseline justify-between gap-2">
                    <p className="truncate text-xs font-extrabold text-stone-700">
                      {index + 1}. {product.name}
                    </p>
                    <p className="shrink-0 text-[10px] font-bold text-stone-400">{product.quantity} vendus</p>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-stone-100">
                    <div
                      className="h-full rounded-full bg-brand"
                      style={{ width: `${Math.max(8, (product.quantity / maxQuantity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm font-semibold text-stone-400">
              Les ventes payées apparaîtront ici.
            </p>
          )}
        </section>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-3">
        <Link href="/admin/menu" className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card transition hover:-translate-y-0.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
            <UtensilsCrossed className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-forest">Gérer le menu</span>
            <span className="text-[11px] text-stone-400">Plats, prix, photos, options</span>
          </span>
        </Link>
        <Link href="/admin/tables" className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card transition hover:-translate-y-0.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-700">
            <QrCode className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-forest">Tables & QR codes</span>
            <span className="text-[11px] text-stone-400">Générer et imprimer les QR</span>
          </span>
        </Link>
        <Link href="/admin/users" className="flex items-center gap-3 rounded-2xl bg-white p-3.5 shadow-card transition hover:-translate-y-0.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-700">
            <Users className="h-4 w-4" />
          </span>
          <span>
            <span className="block text-sm font-extrabold text-forest">Équipe</span>
            <span className="text-[11px] text-stone-400">Comptes admin et caisse</span>
          </span>
        </Link>
      </div>
    </div>
  );
}
