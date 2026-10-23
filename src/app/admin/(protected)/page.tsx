import Link from "next/link";
import {
  ArrowRight,
  ArrowUpRight,
  Banknote,
  CalendarDays,
  ChefHat,
  ClipboardList,
  Download,
  Flame,
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
  const user = await requireAdminPage();
  const todayKey = dayKey();
  const site = await getPublicConfig();

  const [todayOrders, activeOrders, completedToday, tablesCount, usersCount] = await Promise.all([
    prisma.order.findMany({ where: { dayKey: todayKey }, include: { items: true } }),
    prisma.order.findMany({
      where: { status: { in: ACTIVE_STATUSES } },
      orderBy: { submittedAt: "desc" },
      take: 8,
    }),
    prisma.order.findMany({
      where: { dayKey: todayKey, status: "completed" },
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
  const readyCount = activeOrders.filter((order) => order.status === "ready").length;
  const submittedCount = activeOrders.filter((order) => order.status === "submitted").length;
  const todayLabel = new Intl.DateTimeFormat("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date());

  return (
    <div className="space-y-5">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <CalendarDays className="h-3.5 w-3.5" />
            {todayLabel}
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Bonjour, {user.displayName.split(" ")[0]}.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Voici l&apos;état du service chez {site.restaurantName}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/orders" className="btn-primary min-h-11 px-4 text-xs">
            Ouvrir la caisse
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/api/admin/export" className="btn-secondary min-h-11 px-3.5 text-xs">
            <Download className="h-4 w-4" />
            Export CSV
          </Link>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="relative overflow-hidden rounded-[1.5rem] bg-[#12352a] p-5 text-white shadow-lift dark:bg-[#0d281f] sm:col-span-2 xl:col-span-1">
          <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full border-[26px] border-white/[0.05]" />
          <div className="pointer-events-none absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-brand/25 blur-3xl" />
          <div className="relative">
            <div className="flex items-start justify-between gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
                <Banknote className="h-5 w-5 text-[#f0b27a]" />
              </span>
              <span className="rounded-full bg-white/10 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.12em] text-white/55">
                Encaissé
              </span>
            </div>
            <p className="mt-5 font-display text-3xl font-semibold leading-none tracking-tight">
              {formatMoney(revenue, site.currency)}
            </p>
            <p className="mt-2 text-xs font-semibold text-white/50">
              {completedToday.length} commande{completedToday.length > 1 ? "s" : ""} payée{completedToday.length > 1 ? "s" : ""} aujourd&apos;hui
            </p>
            <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full w-2/3 origin-left animate-progress-in rounded-full bg-[#f0b27a]" />
            </div>
          </div>
        </div>

        {[
          {
            label: "Commandes du jour",
            value: String(todayOrders.length),
            hint: `${cancelled} annulée${cancelled > 1 ? "s" : ""}`,
            icon: ClipboardList,
            tone: "bg-sky-100 text-sky-800",
          },
          {
            label: "Ticket moyen",
            value: formatMoney(average, site.currency),
            hint: "sur les commandes payées",
            icon: TrendingUp,
            tone: "bg-amber-100 text-amber-900",
          },
          {
            label: "En cours",
            value: String(activeOrders.length),
            hint: `${submittedCount} à valider · ${readyCount} prête${readyCount > 1 ? "s" : ""}`,
            icon: ShoppingBag,
            tone: "bg-brand-soft text-brand-dark",
          },
        ].map((card) => (
          <div key={card.label} className="group relative overflow-hidden rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${card.tone}`}>
                <card.icon className="h-5 w-5" />
              </span>
              <ArrowUpRight className="h-4 w-4 text-line transition group-hover:text-brand" />
            </div>
            <p className="mt-5 font-display text-3xl font-semibold leading-none text-ink">{card.value}</p>
            <p className="mt-2 text-[11px] font-extrabold text-muted">{card.label}</p>
            <p className="mt-0.5 text-[10px] font-medium text-muted/70">{card.hint}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <section className="overflow-hidden rounded-[1.5rem] border border-line/70 bg-surface shadow-card">
          <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Commandes actives</h2>
              <p className="text-[11px] font-medium text-muted">Les prochaines actions à mener en salle.</p>
            </div>
            <Link href="/admin/orders" className="inline-flex items-center gap-1 text-xs font-extrabold text-brand hover:underline">
              Tout voir
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          {activeOrders.length ? (
            <div className="divide-y divide-line/60">
              {activeOrders.map((order) => (
                <Link key={order.id} href="/admin/orders" className="flex items-center gap-3 px-4 py-3.5 transition hover:bg-sand/30 sm:px-5">
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
                    order.status === "submitted" ? "bg-amber-100 text-amber-900" : order.status === "ready" ? "bg-emerald-100 text-emerald-900" : "bg-sky-100 text-sky-900"
                  }`}>
                    {order.status === "ready" ? <ChefHat className="h-4 w-4" /> : <ShoppingBag className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-display text-base font-semibold leading-none text-ink">{order.orderNumber}</p>
                      <span className="rounded-full bg-sand px-2 py-0.5 text-[9px] font-extrabold text-muted">
                        {order.mode === "dine_in" ? `Table ${order.tableNumber}` : "À emporter"}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-[11px] font-semibold text-muted">{order.customerName}</p>
                  </div>
                  <span className={`badge hidden border sm:inline-flex ${ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.color || "bg-sand text-muted"}`}>
                    {ORDER_STATUS[order.status as keyof typeof ORDER_STATUS]?.label || order.status}
                  </span>
                  <span className="shrink-0 text-sm font-extrabold text-forest">
                    {formatMoney(order.totalCents, site.currency)}
                  </span>
                  <ArrowRight className="h-4 w-4 shrink-0 text-muted/40" />
                </Link>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center px-5 py-14 text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-forest-soft text-forest">
                <ChefHat className="h-6 w-6" />
              </span>
              <p className="mt-4 font-display text-lg font-semibold text-ink">La salle est calme</p>
              <p className="mt-1 text-sm text-muted">Les nouvelles commandes apparaîtront ici en direct.</p>
            </div>
          )}
        </section>

        <section className="rounded-[1.5rem] border border-line/70 bg-surface p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Top produits</h2>
              <p className="text-[11px] font-medium text-muted">Les favoris du jour.</p>
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
                    <p className="shrink-0 text-[10px] font-bold text-muted">{product.quantity} vendus</p>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sand">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-brand to-gold"
                      style={{ width: `${Math.max(8, (product.quantity / maxQuantity) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sand text-muted">
                <UtensilsCrossed className="h-5 w-5" />
              </span>
              <p className="mt-3 text-sm font-bold text-ink">Pas encore de ventes</p>
              <p className="mt-1 text-xs text-muted">Les plats encaissés apparaîtront ici.</p>
            </div>
          )}
        </section>
      </div>

      <div className="grid gap-2.5 sm:grid-cols-3">
        {[
          { href: "/admin/menu", icon: UtensilsCrossed, title: "Gérer le menu", text: "Plats, prix, photos, options", tone: "bg-brand-soft text-brand-dark" },
          { href: "/admin/tables", icon: QrCode, title: "Tables & QR codes", text: "Générer et imprimer les QR", tone: "bg-sky-100 text-sky-900" },
          { href: "/admin/users", icon: Users, title: "Gérer l'équipe", text: `${usersCount} compte${usersCount > 1 ? "s" : ""} actif${usersCount > 1 ? "s" : ""} · ${tablesCount} tables`, tone: "bg-amber-100 text-amber-900" },
        ].map((item) => (
          <Link key={item.href} href={item.href} className="group flex items-center gap-3 rounded-[1.3rem] border border-line/70 bg-surface p-4 shadow-card transition hover:-translate-y-0.5 hover:shadow-soft">
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${item.tone}`}>
              <item.icon className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-ink">{item.title}</span>
              <span className="block truncate text-[10px] font-medium text-muted">{item.text}</span>
            </span>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted/40 transition group-hover:text-brand" />
          </Link>
        ))}
      </div>
    </div>
  );
}
