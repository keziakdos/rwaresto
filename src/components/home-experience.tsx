"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { useSite } from "./site-provider";
import { getTrackedOrders, useCart, type TrackedOrder } from "./cart-provider";
import { ORDER_STATUS } from "@/lib/constants";

type Mode = "dine_in" | "takeaway";

export function HomeExperience({
  initialTable,
  initialMode,
  invalidTable,
}: {
  initialTable: number | null;
  initialMode: Mode;
  invalidTable: boolean;
}) {
  const site = useSite();
  const router = useRouter();
  const cart = useCart();
  const [mode, setMode] = useState<Mode>(initialTable ? "dine_in" : initialMode);
  const [table, setTable] = useState(initialTable ? String(initialTable) : "");
  const [error, setError] = useState(
    invalidTable ? "Ce QR code correspond à une table inconnue ou désactivée." : "",
  );
  const [loading, setLoading] = useState(false);
  const [recentOrders, setRecentOrders] = useState<TrackedOrder[]>([]);

  useEffect(() => {
    setRecentOrders(getTrackedOrders().slice(0, 2));
    if (initialTable) {
      cart.setMode("dine_in");
      cart.setTableNumber(initialTable);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTable]);

  const activeOrder = useMemo(
    () =>
      recentOrders.find((order) =>
        ["submitted", "in_progress", "ready"].includes(order.status),
      ) || recentOrders[0],
    [recentOrders],
  );

  async function startOrder() {
    setError("");
    if (!site.isOpen) {
      setError(site.closedReason || "Les commandes sont fermées.");
      return;
    }
    if (mode === "dine_in") {
      if (!table.trim() || !/^\d+$/.test(table.trim())) {
        setError("Saisissez le numéro de votre table.");
        return;
      }
      setLoading(true);
      try {
        const response = await fetch("/api/tables", { cache: "no-store" });
        const data = await response.json();
        const exists = (data.tables || []).some(
          (item: { number: number }) => item.number === Number(table),
        );
        if (!exists) {
          setError("Ce numéro de table n'existe pas. Vérifiez le QR code de votre table.");
          return;
        }
      } finally {
        setLoading(false);
      }
    }
    cart.setMode(mode);
    cart.setTableNumber(mode === "dine_in" ? Number(table) : null);
    const query = new URLSearchParams({ mode });
    if (mode === "dine_in") query.set("table", table.trim());
    router.push(`/menu?${query.toString()}`);
  }

  return (
    <div>
      <section className="relative overflow-hidden px-4 pb-8 pt-7 sm:pt-12">
        <div
          className="pointer-events-none absolute -left-20 top-10 h-64 w-64 rounded-full opacity-25 blur-3xl"
          style={{ background: site.accentColor }}
        />
        <div
          className="pointer-events-none absolute -right-24 bottom-0 h-72 w-72 rounded-full opacity-25 blur-3xl"
          style={{ background: site.primaryColor }}
        />
        <div className="relative mx-auto grid w-full max-w-5xl gap-8 md:grid-cols-2 md:items-center">
          <div className="animate-slide-up">
            <div className="mb-4 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-forest/10 px-3 py-1.5 text-xs font-extrabold text-forest">
                <QrCode className="h-3.5 w-3.5" />
                Commande à table
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                  site.isOpen ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"
                }`}
              >
                <span className="status-dot" />
                {site.isOpen ? "Ouvert" : "Fermé"}
              </span>
            </div>
            <h1 className="font-display text-[2.75rem] font-bold leading-[1.05] text-forest sm:text-6xl">
              {site.restaurantName}
            </h1>
            <p className="mt-3 max-w-md text-lg font-semibold leading-snug text-ink/65">
              {site.tagline}
            </p>
            <p className="mt-4 max-w-md text-[15px] leading-relaxed text-ink/60">
              {site.welcomeMessage}
            </p>

            <div className="mt-6 grid max-w-md grid-cols-3 gap-2 text-center text-[11px] font-bold text-ink/60">
              <div className="rounded-2xl bg-white/70 px-2 py-3">
                <UtensilsCrossed className="mx-auto mb-1 h-4 w-4 text-brand" />
                Composez
              </div>
              <div className="rounded-2xl bg-white/70 px-2 py-3">
                <Clock className="mx-auto mb-1 h-4 w-4 text-brand" />
                Suivez
              </div>
              <div className="rounded-2xl bg-white/70 px-2 py-3">
                <CheckCircle2 className="mx-auto mb-1 h-4 w-4 text-brand" />
                Payez à la caisse
              </div>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-sm md:max-w-none">
            <div className="absolute -inset-2 rotate-2 rounded-[2.4rem] bg-brand/10" />
            <div className="relative overflow-hidden rounded-[2.2rem] border border-white/60 shadow-soft">
              <Image
                src="/images/bowl-yassa.webp"
                alt="Bol généreux aux couleurs des épices"
                width={960}
                height={720}
                priority
                className="aspect-[4/3] w-full object-cover"
              />
              <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-white/90 px-4 py-3 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-brand">Aujourd'hui</p>
                <p className="font-display text-lg font-bold text-forest">
                  Des bols préparés minute
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-5xl px-4">
        <div className="card overflow-hidden p-5 sm:p-7">
          {!site.isOpen ? (
            <div className="mb-5 flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">
              <Store className="mt-0.5 h-5 w-5 shrink-0" />
              <div>
                <p>Les commandes sont fermées.</p>
                <p className="mt-1 font-medium text-red-800">
                  {site.closedReason || site.hoursText}
                </p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-5 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <div>
              <p className="mb-2 text-sm font-extrabold text-ink/75">Vous mangez…</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("dine_in")}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 text-sm font-extrabold transition ${
                    mode === "dine_in"
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-black/10 bg-white text-ink/60 hover:border-brand/30"
                  }`}
                >
                  <Store className="mb-1 h-5 w-5" />
                  Sur place
                </button>
                <button
                  type="button"
                  onClick={() => setMode("takeaway")}
                  className={`flex min-h-16 flex-col items-center justify-center rounded-2xl border-2 px-3 py-3 text-sm font-extrabold transition ${
                    mode === "takeaway"
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-black/10 bg-white text-ink/60 hover:border-brand/30"
                  }`}
                >
                  <Bike className="mb-1 h-5 w-5" />
                  À emporter
                </button>
              </div>
            </div>

            <div>
              {mode === "dine_in" ? (
                <>
                  <label htmlFor="table-number" className="mb-2 block text-sm font-extrabold text-ink/75">
                    Votre table
                  </label>
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
                    <input
                      id="table-number"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      value={table}
                      onChange={(event) => setTable(event.target.value.replace(/\D/g, ""))}
                      placeholder="Numéro de table"
                      className="field pl-11 text-base font-bold"
                      aria-describedby={error ? "home-error" : undefined}
                    />
                  </div>
                  {initialTable ? (
                    <p className="mt-2 text-xs font-bold text-emerald-700">
                      Table {initialTable} détectée par le QR code
                    </p>
                  ) : (
                    <p className="mt-2 text-xs text-ink/45">Indiqué sur le QR code de votre table.</p>
                  )}
                </>
              ) : (
                <>
                  <p className="mb-2 text-sm font-extrabold text-ink/75">À emporter</p>
                  <div className="flex min-h-12 items-center gap-2 rounded-2xl bg-sand/60 px-4 text-sm font-semibold text-ink/60">
                    <Bike className="h-5 w-5 text-forest" />
                    Commandez, on prépare, vous récupérez sur place.
                  </div>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={startOrder}
              disabled={!site.isOpen || loading}
              className="btn-primary min-h-14 w-full px-7 text-base md:w-auto"
            >
              {loading ? "Vérification…" : "Commander"}
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>

          {error ? (
            <p id="home-error" role="alert" className="mt-3 text-sm font-bold text-red-700">
              {error}
            </p>
          ) : null}

          {!site.isOpen ? (
            <p className="mt-3 text-xs font-medium text-ink/50">
              {site.hoursText} · {site.address}
            </p>
          ) : null}
        </div>

        {activeOrder ? (
          <Link
            href={`/commande/${activeOrder.id}?t=${activeOrder.token}`}
            className="mt-4 flex items-center gap-3 rounded-2xl border border-forest/10 bg-forest px-4 py-3.5 text-white shadow-card transition hover:bg-forest-light"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/15">
              <Clock className="h-5 w-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-bold uppercase tracking-wide text-white/60">
                Commande en cours · {activeOrder.orderNumber}
              </span>
              <span className="block truncate text-sm font-extrabold">
                {ORDER_STATUS[activeOrder.status as keyof typeof ORDER_STATUS]?.label ||
                  "Suivre ma commande"}
              </span>
            </span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        ) : null}
      </section>

      <section className="mx-auto mt-8 w-full max-w-5xl px-4">
        <div className="grid gap-3 sm:grid-cols-3">
          {[
            {
              icon: QrCode,
              title: "1. Scannez",
              text: "Le QR code de votre table ouvre le menu, table déjà renseignée.",
            },
            {
              icon: UtensilsCrossed,
              title: "2. Composez",
              text: "Choisissez vos plats et options. Chaque personne commande pour elle.",
            },
            {
              icon: CheckCircle2,
              title: "3. Payez à la caisse",
              text: "Quand c'est prêt, donnez votre table ou votre pseudo pour payer.",
            },
          ].map((step) => (
            <div key={step.title} className="rounded-3xl border border-black/5 bg-white/65 p-4">
              <step.icon className="mb-2 h-5 w-5 text-brand" />
              <p className="font-display text-base font-bold text-forest">{step.title}</p>
              <p className="mt-1 text-sm leading-snug text-ink/55">{step.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-5 text-center text-xs font-semibold text-ink/45">
          Plusieurs personnes à la même table ? Chacun commande avec son prénom ou pseudo et paie
          sa propre commande.
        </p>
      </section>
    </div>
  );
}
