"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bike,
  CheckCircle2,
  ChefHat,
  Clock,
  Flame,
  Leaf,
  MapPin,
  QrCode,
  Sparkles,
  Store,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { useSite } from "./site-provider";
import { getTrackedOrders, useCart, type TrackedOrder } from "./cart-provider";
import { ORDER_STATUS } from "@/lib/constants";

type Mode = "dine_in" | "takeaway";

const HIGHLIGHTS = [
  {
    image: "/images/muceli.jpg",
    title: "La table familiale",
    text: "Des plats généreux posés au centre, à partager sans compter.",
    icon: Leaf,
  },
  {
    image: "/images/ugali.jpg",
    title: "Le feu & les braises",
    text: "Grillades, sauces profondes et accompagnements réconfortants.",
    icon: Flame,
  },
  {
    image: "/images/drink.jpg",
    title: "Les rituels de table",
    text: "Calebasses, épices et boissons pour prolonger le moment.",
    icon: Sparkles,
  },
];

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
    <div className="overflow-hidden">
      <section className="relative isolate overflow-hidden bg-[#0d281f] text-white">
        <Image
          src="/images/backglound.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[55%_62%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(105deg,rgba(8,28,21,.92)_0%,rgba(8,28,21,.78)_38%,rgba(8,28,21,.28)_72%,rgba(8,28,21,.48)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b241b]/85 via-transparent to-[#0b241b]/10" />
        <div className="pointer-events-none absolute -left-28 top-20 h-80 w-80 rounded-full bg-[#d5a24b]/15 blur-3xl" />
        <div className="pointer-events-none absolute -right-20 bottom-0 h-96 w-96 rounded-full bg-brand/20 blur-3xl" />

        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 px-4 pb-16 pt-10 sm:px-6 sm:pb-20 sm:pt-14 lg:grid-cols-[1.04fr_.96fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[0.12em] text-white/85 backdrop-blur">
                <QrCode className="h-3.5 w-3.5 text-[#f0b27a]" />
                Commande à table
              </span>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-extrabold backdrop-blur ${
                  site.isOpen
                    ? "border-emerald-300/20 bg-emerald-400/15 text-emerald-100"
                    : "border-red-300/20 bg-red-400/15 text-red-100"
                }`}
              >
                <span className="status-dot" />
                {site.isOpen ? "Ouvert maintenant" : "Commandes fermées"}
              </span>
              {initialTable ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-brand px-3 py-1.5 text-[11px] font-extrabold text-white shadow-glow">
                  <MapPin className="h-3.5 w-3.5" />
                  Table {initialTable}
                </span>
              ) : null}
            </div>

            <p className="mt-7 flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.22em] text-[#f0b27a]">
              <span className="h-px w-8 bg-[#f0b27a]/45" />
              {site.restaurantName}
            </p>
            <h1 className="mt-3 max-w-xl text-balance font-display text-[2.85rem] font-semibold leading-[0.98] text-white sm:text-6xl lg:text-[4.35rem]">
              {site.tagline}
            </h1>
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-white/70 sm:text-lg">
              {site.welcomeMessage}
            </p>

            <div className="mt-7 flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <a href="#commander" className="btn-primary min-h-14 px-7 text-base shadow-glow">
                Commander maintenant
                <ArrowRight className="h-5 w-5" />
              </a>
              <Link
                href="/menu"
                className="inline-flex min-h-14 items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-6 text-base font-extrabold text-white shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white/15"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Parcourir la carte
              </Link>
            </div>

            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-3.5 py-2 text-[11px] font-semibold text-white/70 backdrop-blur">
              <Clock className="h-3.5 w-3.5 text-[#f0b27a]" />
              Petit-déjeuner de 9h à 11h · carte complète dès 11h
            </div>

            <div className="mt-5 grid max-w-lg grid-cols-3 gap-2">
              {[
                { icon: ChefHat, title: "Fait minute", text: "Cuisiné sur place" },
                { icon: Clock, title: "Suivi live", text: "Statut en direct" },
                { icon: Wallet, title: "À la caisse", text: "Sans paiement en ligne" },
              ].map((item) => (
                <div key={item.title} className="rounded-2xl border border-white/10 bg-white/[0.07] px-3 py-3 backdrop-blur">
                  <item.icon className="h-4 w-4 text-[#f0b27a]" />
                  <p className="mt-2 text-[11px] font-extrabold text-white">{item.title}</p>
                  <p className="text-[10px] font-medium text-white/50">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-[30rem] animate-fade-up lg:max-w-none [animation-delay:120ms]">
            <div className="absolute -inset-3 -rotate-2 rounded-[3rem] border border-white/10 bg-white/[0.04]" />
            <div className="relative aspect-[4/5] overflow-hidden rounded-[2.5rem] border border-white/15 bg-white/5 shadow-2xl sm:aspect-[5/5.2]">
              <Image
                src="/images/matoke.jpg"
                alt="Plat mijoté généreux, servi avec des épices et des légumes frais"
                fill
                priority
                sizes="(max-width: 1024px) 90vw, 560px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#120c08]/85 via-transparent to-[#120c08]/10" />
              <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-black/30 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-white/90 backdrop-blur">
                <Flame className="h-3.5 w-3.5 text-[#f0b27a]" />
                Cuisine du feu
              </span>
              <div className="absolute inset-x-4 bottom-4 rounded-[1.4rem] border border-white/15 bg-black/35 p-4 text-white backdrop-blur-md">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-[#f0b27a]">L&apos;esprit maison</p>
                <p className="mt-1.5 font-display text-2xl font-semibold leading-tight">
                  Des plats mijotés, posés au centre.
                </p>
                <p className="mt-1.5 text-xs font-medium leading-relaxed text-white/65">
                  Des recettes généreuses, des épices torréfiées et de la chaleur à partager.
                </p>
                <Link href="/menu" className="mt-3 inline-flex items-center gap-1.5 text-xs font-extrabold text-[#f0b27a]">
                  Voir la carte
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div className="absolute -right-2 top-8 hidden rounded-2xl border border-white/15 bg-black/30 px-3.5 py-3 text-white shadow-card backdrop-blur sm:block lg:-right-6">
              <p className="text-[10px] font-bold uppercase tracking-wide text-white/45">Service</p>
              <p className="mt-0.5 flex items-center gap-1.5 font-display text-lg font-semibold text-white">
                <span className={`h-2 w-2 rounded-full ${site.isOpen ? "bg-emerald-400" : "bg-red-400"}`} />
                {site.isOpen ? "En salle" : "Fermé"}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section id="commander" className="scroll-mt-24 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-6xl">
          <div className="card-elevated overflow-hidden">
            <div className="grid lg:grid-cols-[.9fr_1.1fr]">
              <div className="relative overflow-hidden bg-forest px-5 py-7 text-white sm:px-7 lg:px-8 lg:py-9 dark:bg-[#102b22]">
                <Image src="/images/ugali.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 480px" className="object-cover opacity-35" />
                <div className="absolute inset-0 bg-gradient-to-br from-[#0b241b]/90 via-[#0b241b]/70 to-[#0b241b]/40" />
                <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full border-[28px] border-white/5" />
                <div className="pointer-events-none absolute -bottom-20 -left-10 h-52 w-52 rounded-full bg-brand/20 blur-3xl" />
                <div className="relative">
                  <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/45">Votre commande</p>
                  <h2 className="mt-2 max-w-xs font-display text-3xl font-semibold leading-tight sm:text-4xl">
                    Installez-vous, on s&apos;occupe du reste.
                  </h2>
                  <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/65">
                    Choisissez votre mode de service, indiquez votre table et composez votre repas.
                  </p>

                  <div className="mt-7 space-y-2.5">
                    {[
                      { icon: QrCode, title: "Scannez ou saisissez", text: "Votre table est reconnue automatiquement." },
                      { icon: ChefHat, title: "La cuisine prépare", text: "Suivez l'avancement en temps réel." },
                      { icon: CheckCircle2, title: "Payez à la caisse", text: "Donnez votre pseudo au moment de régler." },
                    ].map((step, index) => (
                      <div key={step.title} className="flex items-start gap-3">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/10 ring-1 ring-white/10">
                          <step.icon className="h-4 w-4 text-[#f0b27a]" />
                        </span>
                        <div>
                          <p className="text-sm font-bold">
                            <span className="mr-1.5 text-white/35">0{index + 1}</span>
                            {step.title}
                          </p>
                          <p className="text-xs leading-snug text-white/55">{step.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-7 lg:p-8">
                {!site.isOpen ? (
                  <div className="mb-5 flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-900">
                    <Store className="mt-0.5 h-5 w-5 shrink-0" />
                    <div>
                      <p className="font-extrabold">Les commandes sont fermées.</p>
                      <p className="mt-0.5 font-medium text-red-800">{site.closedReason || site.hoursText}</p>
                    </div>
                  </div>
                ) : null}

                <p className="text-sm font-extrabold text-ink">Vous mangez…</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setMode("dine_in")}
                    aria-pressed={mode === "dine_in"}
                    className={`group relative flex min-h-[6.2rem] flex-col items-start justify-between rounded-[1.4rem] border-2 p-4 text-left transition ${
                      mode === "dine_in"
                        ? "border-brand bg-brand-soft/70 shadow-card"
                        : "border-line bg-surface hover:border-brand/30"
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${mode === "dine_in" ? "bg-brand text-white" : "bg-sand text-forest"}`}>
                      <Store className="h-5 w-5" />
                    </span>
                    <span>
                      <span className={`block text-sm font-extrabold ${mode === "dine_in" ? "text-brand-dark" : "text-ink"}`}>Sur place</span>
                      <span className="block text-[11px] font-medium text-muted">Je suis à une table</span>
                    </span>
                    {mode === "dine_in" ? <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-brand" /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("takeaway")}
                    aria-pressed={mode === "takeaway"}
                    className={`group relative flex min-h-[6.2rem] flex-col items-start justify-between rounded-[1.4rem] border-2 p-4 text-left transition ${
                      mode === "takeaway"
                        ? "border-brand bg-brand-soft/70 shadow-card"
                        : "border-line bg-surface hover:border-brand/30"
                    }`}
                  >
                    <span className={`flex h-10 w-10 items-center justify-center rounded-2xl ${mode === "takeaway" ? "bg-brand text-white" : "bg-sand text-forest"}`}>
                      <Bike className="h-5 w-5" />
                    </span>
                    <span>
                      <span className={`block text-sm font-extrabold ${mode === "takeaway" ? "text-brand-dark" : "text-ink"}`}>À emporter</span>
                      <span className="block text-[11px] font-medium text-muted">Je récupère sur place</span>
                    </span>
                    {mode === "takeaway" ? <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-brand" /> : null}
                  </button>
                </div>

                <div className="mt-5">
                  {mode === "dine_in" ? (
                    <>
                      <label htmlFor="table-number" className="mb-2 block text-sm font-extrabold text-ink">
                        Votre numéro de table
                      </label>
                      <div className="relative">
                        <MapPin className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-brand" />
                        <input
                          id="table-number"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={table}
                          onChange={(event) => setTable(event.target.value.replace(/\D/g, ""))}
                          placeholder="Ex. 12"
                          className="field h-14 pl-12 text-base font-bold"
                          aria-describedby={error ? "home-error" : undefined}
                        />
                        {initialTable ? (
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-extrabold text-emerald-900">
                            QR détecté
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-2 text-xs text-muted">
                        {initialTable ? `Table ${initialTable} reconnue. Vous pouvez modifier le numéro si besoin.` : "Le numéro figure sur le QR code posé sur votre table."}
                      </p>
                    </>
                  ) : (
                    <div className="flex min-h-14 items-center gap-3 rounded-2xl border border-line bg-sand/50 px-4 text-sm text-muted">
                      <Bike className="h-5 w-5 shrink-0 text-forest" />
                      <p>
                        <span className="font-extrabold text-ink">Commande à emporter.</span> On prépare, vous récupérez au comptoir.
                      </p>
                    </div>
                  )}
                </div>

                {error ? (
                  <p id="home-error" role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm font-bold text-red-800">
                    {error}
                  </p>
                ) : null}

                <button
                  type="button"
                  onClick={startOrder}
                  disabled={!site.isOpen || loading}
                  className="btn-primary mt-5 min-h-14 w-full px-7 text-base"
                >
                  {loading ? "Vérification…" : "Voir la carte et commander"}
                  <ArrowRight className="h-5 w-5" />
                </button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11px] font-medium text-muted">
                  <Wallet className="h-3.5 w-3.5" />
                  Aucun paiement en ligne · règlement à la caisse
                </p>
              </div>
            </div>

            {activeOrder ? (
              <Link
                href={`/commande/${activeOrder.id}?t=${activeOrder.token}`}
                className="flex items-center gap-3 border-t border-line/70 bg-sand/35 px-5 py-4 transition hover:bg-sand/60 sm:px-7"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-forest text-white">
                  <Clock className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">
                    Commande en cours · {activeOrder.orderNumber}
                  </span>
                  <span className="block truncate text-sm font-extrabold text-ink">
                    {ORDER_STATUS[activeOrder.status as keyof typeof ORDER_STATUS]?.label || "Suivre ma commande"}
                  </span>
                </span>
                <span className="hidden text-xs font-bold text-brand sm:block">Suivre</span>
                <ArrowRight className="h-5 w-5 text-brand" />
              </Link>
            ) : null}
          </div>
        </div>
      </section>

      <section className="px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-6xl">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="eyebrow">La maison</p>
              <h2 className="mt-2 max-w-xl font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
                Des recettes qui racontent un voyage
              </h2>
            </div>
            <Link href="/menu" className="group inline-flex items-center gap-2 text-sm font-extrabold text-brand">
              Voir toute la carte
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft transition group-hover:bg-brand group-hover:text-white">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          <div className="mt-7 grid gap-4 sm:grid-cols-3">
            {HIGHLIGHTS.map((item, index) => (
              <Link
                key={item.title}
                href="/menu"
                className="group relative overflow-hidden rounded-[1.8rem] bg-forest shadow-card"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <div className="relative aspect-[4/3]">
                  <Image
                    src={item.image}
                    alt={item.title}
                    fill
                    sizes="(max-width: 640px) 100vw, 33vw"
                    className="object-cover transition duration-700 group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#12251d]/90 via-[#12251d]/10 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-5 text-white">
                  <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 backdrop-blur">
                    <item.icon className="h-4 w-4 text-[#f0b27a]" />
                  </span>
                  <p className="mt-3 font-display text-xl font-semibold">{item.title}</p>
                  <p className="mt-1 text-xs leading-snug text-white/65">{item.text}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="etapes" className="scroll-mt-24 px-4 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-line/70 bg-surface shadow-card">
          <div className="grid lg:grid-cols-[.8fr_1.2fr]">
            <div className="relative overflow-hidden bg-[#12352a] p-6 text-white sm:p-9 dark:bg-[#0d281f]">
              <Image src="/images/muceli.jpg" alt="" fill sizes="(max-width: 1024px) 100vw, 420px" className="object-cover opacity-35" />
              <div className="absolute inset-0 bg-gradient-to-br from-[#0b241b]/90 via-[#0b241b]/70 to-[#0b241b]/40" />
              <div className="pointer-events-none absolute -bottom-16 -right-16 h-56 w-56 rounded-full bg-brand/25 blur-3xl" />
              <div className="relative">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-white/45">Simple & fluide</p>
                <h2 className="mt-2 font-display text-3xl font-semibold leading-tight sm:text-4xl">
                  Trois étapes, zéro friction.
                </h2>
                <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/60">
                  Chaque personne à la table peut commander avec son prénom ou pseudo et régler sa propre commande.
                </p>
                <div className="mt-8 flex items-center gap-2 text-[11px] font-bold text-white/50">
                  <span className="h-px w-10 bg-white/20" />
                  À votre rythme
                </div>
              </div>
            </div>
            <div className="grid gap-0 sm:grid-cols-3">
              {[
                { icon: QrCode, title: "Scannez", text: "Le QR code de votre table ouvre le menu, table déjà renseignée." },
                { icon: UtensilsCrossed, title: "Composez", text: "Choisissez vos plats et options. Chaque personne commande pour elle." },
                { icon: CheckCircle2, title: "Savourez", text: "Suivez la préparation, récupérez votre commande et payez à la caisse." },
              ].map((step, index) => (
                <div key={step.title} className="relative border-b border-line/70 p-6 last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
                  <span className="text-[10px] font-extrabold tracking-[0.2em] text-brand">0{index + 1}</span>
                  <span className="mt-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
                    <step.icon className="h-5 w-5" />
                  </span>
                  <h3 className="mt-4 font-display text-xl font-semibold text-ink">{step.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted">{step.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
