"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Check,
  CheckCircle2,
  ChefHat,
  Clock3,
  MapPin,
  ReceiptText,
  RefreshCw,
  Sparkles,
  Store,
  Volume2,
} from "lucide-react";
import { ORDER_STATUS, MODE_LABELS, type OrderStatus } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { trackOrder } from "./cart-provider";
import { useMoney, useSite } from "./site-provider";
import { EmptyState } from "./ui/empty-state";
import { Badge } from "./ui/badge";

type OrderDetail = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  mode: "dine_in" | "takeaway";
  tableNumber: number | null;
  customerName: string;
  note: string | null;
  cancelReason: string | null;
  subtotalCents: number;
  totalCents: number;
  paymentStatus: string;
  paymentMethod: string | null;
  submittedAt: string;
  validatedAt: string | null;
  readyAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  items: {
    id: string;
    name: string;
    unitPriceCents: number;
    quantity: number;
    note: string | null;
    lineTotalCents: number;
    options: { groupName: string; choiceName: string; priceDeltaCents: number }[];
  }[];
};

const STEPS = [
  { key: "submitted", label: "Commande envoyée", text: "La caisse reçoit votre commande.", icon: ReceiptText },
  { key: "in_progress", label: "En préparation", text: "La cuisine a validé et prépare vos plats.", icon: ChefHat },
  { key: "ready", label: "C'est prêt", text: "Récupérez votre commande et payez à la caisse.", icon: BellRing },
  { key: "completed", label: "Terminée", text: "Merci, et à très bientôt.", icon: Check },
];

const STEP_INDEX: Record<string, number> = {
  submitted: 0,
  in_progress: 1,
  ready: 2,
  completed: 3,
  cancelled: 0,
};

function playReadySound() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const notes = [660, 880, 1046];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.16);
      gain.gain.exponentialRampToValueAtTime(0.18, context.currentTime + index * 0.16 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.16 + 0.28);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + index * 0.16);
      oscillator.stop(context.currentTime + index * 0.16 + 0.3);
    });
    setTimeout(() => context.close().catch(() => undefined), 1400);
  } catch {
    // Le son est un bonus, le statut reste visible.
  }
}

export function OrderTracking({ orderId, token }: { orderId: string; token: string }) {
  const site = useSite();
  const money = useMoney();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [readyFlash, setReadyFlash] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const previousStatus = useRef<string | null>(null);
  const soundRef = useRef(false);

  const loadOrder = useCallback(
    async (silent = false) => {
      if (!token) {
        setError("Ce lien de suivi est incomplet.");
        setLoading(false);
        return;
      }
      if (!silent) setLoading(true);
      try {
        const response = await fetch(
          `/api/orders/${orderId}?token=${encodeURIComponent(token)}`,
          { cache: "no-store" },
        );
        if (!response.ok) throw new Error("not-found");
        const data = (await response.json()) as OrderDetail;
        if (
          previousStatus.current &&
          previousStatus.current !== "ready" &&
          data.status === "ready"
        ) {
          setReadyFlash(true);
          if (soundRef.current) playReadySound();
          if (navigator.vibrate) navigator.vibrate([120, 60, 120, 60, 220]);
        }
        previousStatus.current = data.status;
        setOrder(data);
        setError("");
        trackOrder({
          id: data.id,
          token,
          orderNumber: data.orderNumber,
          status: data.status,
          createdAt: data.submittedAt,
        });
      } catch {
        if (!silent) setError("Cette commande est introuvable ou le lien n'est plus valide.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [orderId, token],
  );

  useEffect(() => {
    loadOrder();
    const interval = setInterval(() => loadOrder(true), 12000);
    let source: EventSource | null = null;
    if (token) {
      source = new EventSource(
        `/api/orders/${orderId}/events?token=${encodeURIComponent(token)}`,
      );
      source.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "order.updated" && data.orderId === orderId) loadOrder(true);
        } catch {
          // ignore
        }
      };
      source.onerror = () => {
        source?.close();
      };
    }
    return () => {
      clearInterval(interval);
      source?.close();
    };
  }, [loadOrder, orderId, token]);

  useEffect(() => {
    if (!readyFlash) return;
    const timer = setTimeout(() => setReadyFlash(false), 12000);
    return () => clearTimeout(timer);
  }, [readyFlash]);

  function enableSound() {
    soundRef.current = true;
    setSoundEnabled(true);
    playReadySound();
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
        <div className="skeleton h-10 w-40" />
        <div className="skeleton mt-4 h-64 w-full rounded-[2rem]" />
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="skeleton h-28 rounded-3xl" />
          <div className="skeleton h-28 rounded-3xl" />
        </div>
        <div className="skeleton mt-4 h-64 rounded-[2rem]" />
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16">
        <EmptyState
          icon={AlertCircle}
          title="Commande introuvable"
          description={error || "Le lien de suivi n'est plus valide."}
          action={
            <Link href="/" className="btn-primary">
              Retour à l&apos;accueil
            </Link>
          }
        />
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const currentStep = STEP_INDEX[order.status] ?? 0;
  const ready = order.status === "ready";
  const completed = order.status === "completed";
  const heroTone = cancelled
    ? "bg-red-800"
    : ready
      ? "bg-emerald-800"
      : "bg-[#12352a] dark:bg-[#0d281f]";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-5 sm:py-8">
      {readyFlash ? (
        <div className="mb-4 flex items-center gap-3 rounded-[1.4rem] border border-emerald-200 bg-emerald-50 p-4 text-emerald-950 shadow-card animate-slide-up">
          <span className="flex h-11 w-11 shrink-0 animate-pulse-soft items-center justify-center rounded-full bg-emerald-600 text-white">
            <BellRing className="h-5 w-5" />
          </span>
          <div>
            <p className="font-display text-lg font-semibold">C&apos;est prêt !</p>
            <p className="text-sm font-medium text-emerald-800">Venez chercher votre commande et payez à la caisse.</p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="btn-ghost min-h-10 px-2 text-sm">
          <ArrowRight className="h-4 w-4 rotate-180" />
          Accueil
        </Link>
        {!soundEnabled ? (
          <button type="button" onClick={enableSound} className="btn-ghost min-h-9 px-2 text-xs">
            <Volume2 className="h-4 w-4" />
            Activer le son
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1.5 text-[11px] font-bold text-emerald-900">
            <Volume2 className="h-3.5 w-3.5" />
            Son activé
          </span>
        )}
      </div>

      <section className={`relative mt-3 overflow-hidden rounded-[2rem] p-6 text-white shadow-lift sm:p-8 ${heroTone}`}>
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[34px] border-white/[0.06]" />
        <div className="pointer-events-none absolute -bottom-24 left-1/4 h-56 w-56 rounded-full bg-white/5 blur-3xl" />
        <div className="relative">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/45">
                <ReceiptText className="h-3.5 w-3.5" />
                Votre commande
              </p>
              <p className="mt-2 font-display text-5xl font-semibold leading-none tracking-tight sm:text-6xl">
                {order.orderNumber}
              </p>
            </div>
            <span className={`rounded-full px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.1em] ${
              cancelled ? "bg-white/15 text-white" : ready ? "bg-white text-emerald-900" : "bg-white/10 text-white/85 ring-1 ring-white/15"
            }`}>
              {ORDER_STATUS[order.status]?.label || order.status}
            </span>
          </div>

          <p className="mt-4 max-w-md text-sm font-medium leading-relaxed text-white/70" aria-live="polite">
            {cancelled
              ? `Commande annulée${order.cancelReason ? ` : ${order.cancelReason}` : ""}`
              : ORDER_STATUS[order.status]?.clientLabel}
          </p>

          <div className="mt-7 flex items-center gap-1.5">
            {STEPS.map((step, index) => {
              const done = index < currentStep || completed;
              const current = index === currentStep && !completed;
              return (
                <div key={step.key} className="flex flex-1 items-center gap-1.5 last:flex-none">
                  <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-extrabold ${
                    done
                      ? "bg-[#f0b27a] text-[#2a1a12]"
                      : current
                        ? "bg-white text-[#12352a] ring-4 ring-white/15"
                        : "bg-white/10 text-white/35"
                  }`}>
                    {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : index + 1}
                  </span>
                  {index < STEPS.length - 1 ? (
                    <span className={`h-0.5 flex-1 rounded-full ${done ? "bg-[#f0b27a]" : "bg-white/10"}`} />
                  ) : null}
                </div>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[9px] font-bold uppercase tracking-[0.08em] text-white/35">
            <span>Envoyée</span>
            <span>Préparation</span>
            <span>Prête</span>
            <span>Terminée</span>
          </div>
        </div>
      </section>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <div className="rounded-[1.35rem] border border-line/70 bg-surface p-4 text-center shadow-card">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
            {order.mode === "dine_in" ? <MapPin className="h-4 w-4" /> : <Store className="h-4 w-4" />}
          </span>
          <p className="mt-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted">
            {order.mode === "dine_in" ? "Votre table" : "Mode"}
          </p>
          <p className="mt-0.5 font-display text-2xl font-semibold text-ink">
            {order.mode === "dine_in" ? order.tableNumber : "Emporter"}
          </p>
          <p className="text-[10px] font-medium text-muted">
            {order.mode === "dine_in" ? "À donner à la caisse" : "Retrait au comptoir"}
          </p>
        </div>
        <div className="rounded-[1.35rem] border border-line/70 bg-surface p-4 text-center shadow-card">
          <span className="mx-auto flex h-9 w-9 items-center justify-center rounded-xl bg-forest-soft text-forest">
            <Sparkles className="h-4 w-4" />
          </span>
          <p className="mt-2 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted">Votre pseudo</p>
          <p className="mt-0.5 truncate font-display text-2xl font-semibold text-ink">{order.customerName}</p>
          <p className="text-[10px] font-medium text-muted">Pour retrouver la commande</p>
        </div>
      </div>

      <section className="mt-3 rounded-[1.75rem] border border-line/70 bg-surface p-5 shadow-card sm:p-6">
        {!cancelled ? (
          <ol aria-label="Étapes de la commande">
            {STEPS.map((step, index) => {
              const done = index < currentStep || completed;
              const current = index === currentStep && !completed;
              const Icon = step.icon;
              return (
                <li key={step.key} className="relative flex gap-3.5 pb-6 last:pb-0">
                  {index < STEPS.length - 1 ? (
                    <span
                      aria-hidden="true"
                      className={`absolute left-[19px] top-9 h-[calc(100%-2.25rem)] w-0.5 rounded-full ${
                        done ? "bg-brand" : "bg-line"
                      }`}
                    />
                  ) : null}
                  <span
                    className={`relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 transition ${
                      done
                        ? "border-brand bg-brand text-white"
                        : current
                          ? "border-brand bg-brand-soft text-brand-dark ring-4 ring-brand/10"
                          : "border-line bg-surface text-muted/45"
                    } ${current ? "animate-pulse-soft" : ""}`}
                  >
                    <Icon className="h-4 w-4" strokeWidth={2.5} />
                  </span>
                  <div className="min-w-0 pt-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-sm font-extrabold ${done || current ? "text-ink" : "text-muted/55"}`}>
                        {step.label}
                      </p>
                      {current ? <Badge tone="brand">En cours</Badge> : null}
                      {done ? <CheckCircle2 className="h-4 w-4 text-emerald-600" /> : null}
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted">{step.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-900">
            <p className="font-bold">Motif de l&apos;annulation</p>
            <p className="mt-1">{order.cancelReason || "Contactez la caisse pour plus d'informations."}</p>
          </div>
        )}

        {ready ? (
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <Store className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
            <div className="text-sm text-emerald-950">
              <p className="font-extrabold">Rendez-vous à la caisse</p>
              <p className="mt-0.5 font-medium text-emerald-800">
                Donnez la table {order.mode === "dine_in" ? order.tableNumber : ""} et le pseudo «{" "}
                {order.customerName} ». Le paiement se fait sur place.
              </p>
            </div>
          </div>
        ) : null}

        {completed ? (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-950">
            <span className="flex h-10 w-10 shrink-0 animate-scale-in items-center justify-center rounded-full bg-emerald-600 text-white">
              <Check className="h-5 w-5" strokeWidth={3} />
            </span>
            <div>
              <p className="font-extrabold">Commande réglée</p>
              <p className="text-xs text-emerald-800">Merci et à très bientôt !</p>
            </div>
          </div>
        ) : null}

        {order.note ? (
          <p className="mt-4 rounded-xl border border-line/70 bg-sand/40 p-3 text-xs italic text-muted">
            Remarque : {order.note}
          </p>
        ) : null}
      </section>

      <section className="mt-3 rounded-[1.75rem] border border-line/70 bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-xl font-semibold text-ink">Récapitulatif</h2>
          <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} article
            {order.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? "s" : ""}
          </span>
        </div>
        <div className="mt-4 space-y-3">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-start gap-3">
              <span className="mt-0.5 flex h-7 min-w-7 items-center justify-center rounded-full bg-sand px-1.5 text-[11px] font-extrabold text-forest">
                {item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-extrabold text-ink">{item.name}</p>
                {item.options.length ? (
                  <p className="mt-0.5 text-[11px] leading-snug text-muted">
                    {item.options
                      .map((option) => `${option.groupName}: ${option.choiceName}`)
                      .join(" · ")}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="mt-0.5 text-[11px] italic text-muted/75">« {item.note} »</p>
                ) : null}
              </div>
              <p className="shrink-0 text-sm font-bold tabular-nums">{money(item.lineTotalCents)}</p>
            </div>
          ))}
        </div>
        <div className="mt-5 flex items-center justify-between gap-3 rounded-[1.2rem] bg-[#12352a] px-4 py-4 text-white dark:bg-[#0d281f]">
          <div>
            <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-white/45">
              <Clock3 className="h-3 w-3" />
              Envoyée à {formatTime(order.submittedAt)}
            </p>
            <p className="mt-1 text-[11px] font-medium text-white/65">
              {order.paymentStatus === "paid" ? "Payée" : "À régler à la caisse"}
            </p>
          </div>
          <p className="font-display text-3xl font-semibold leading-none">{money(order.totalCents)}</p>
        </div>
      </section>

      <div className="mt-4 flex items-center justify-center gap-2 text-[11px] font-semibold text-muted">
        <MapPin className="h-3.5 w-3.5 text-brand" />
        {site.restaurantName} · {site.hoursText}
      </div>

      <div className="mt-5 flex flex-col gap-2 sm:flex-row">
        <Link
          href={
            order.mode === "dine_in" && order.tableNumber
              ? `/menu?table=${order.tableNumber}&mode=dine_in`
              : "/menu?mode=takeaway"
          }
          className="btn-secondary flex-1"
        >
          Commander autre chose
          <ArrowRight className="h-4 w-4" />
        </Link>
        <button type="button" onClick={() => loadOrder()} className="btn-ghost flex-1">
          <RefreshCw className="h-4 w-4" />
          Actualiser
        </button>
      </div>

      <p className="mt-4 text-center text-[10px] leading-relaxed text-muted/70">
        {MODE_LABELS[order.mode]} · Cette page se met à jour automatiquement. Gardez ce lien pour suivre votre commande.
      </p>
    </div>
  );
}
