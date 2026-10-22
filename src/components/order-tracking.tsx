"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  ArrowRight,
  BellRing,
  Check,
  ChefHat,
  Clock3,
  MapPin,
  ReceiptText,
  RefreshCw,
  Store,
  Volume2,
} from "lucide-react";
import { ORDER_STATUS, MODE_LABELS, type OrderStatus } from "@/lib/constants";
import { formatTime } from "@/lib/format";
import { trackOrder } from "./cart-provider";
import { useMoney, useSite } from "./site-provider";

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
  { key: "submitted", label: "Envoyée", text: "En attente de la caisse", icon: ReceiptText },
  { key: "in_progress", label: "En préparation", text: "Validée par la caisse", icon: ChefHat },
  { key: "ready", label: "Prête", text: "À retirer et payer", icon: BellRing },
  { key: "completed", label: "Terminée", text: "Merci et à bientôt", icon: Check },
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
      <div className="mx-auto flex max-w-lg flex-col items-center px-4 py-20 text-center">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-brand/20 border-t-brand" />
        <p className="mt-4 text-sm font-bold text-ink/50">Je retrouve votre commande…</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <AlertCircle className="mx-auto h-12 w-12 text-red-300" />
        <h1 className="mt-4 font-display text-2xl font-bold text-forest">Commande introuvable</h1>
        <p className="mt-2 text-sm text-ink/55">{error}</p>
        <Link href="/" className="btn-primary mt-6">
          Retour à l'accueil
        </Link>
      </div>
    );
  }

  const cancelled = order.status === "cancelled";
  const currentStep = STEP_INDEX[order.status] ?? 0;
  const ready = order.status === "ready";
  const completed = order.status === "completed";

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {readyFlash ? (
        <div className="mb-4 flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900 animate-slide-up">
          <BellRing className="h-6 w-6 shrink-0 animate-pulse-soft" />
          <div>
            <p className="font-display text-lg font-bold">C'est prêt !</p>
            <p className="text-sm font-semibold">
              Venez chercher votre commande et payez à la caisse.
            </p>
          </div>
        </div>
      ) : null}

      <div className="flex items-center justify-between gap-2">
        <Link href="/" className="btn-ghost min-h-10 px-2 text-sm">
          <ArrowRight className="h-4 w-4 rotate-180" />
          Accueil
        </Link>
        <div className="flex items-center gap-2">
          {!soundEnabled ? (
            <button type="button" onClick={enableSound} className="btn-ghost min-h-9 px-2 text-xs">
              <Volume2 className="h-4 w-4" />
              Activer le son
            </button>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
              <Volume2 className="h-3.5 w-3.5" />
              Son activé
            </span>
          )}
        </div>
      </div>

      <div className="mt-3 overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-soft">
        <div className={`px-5 py-5 ${cancelled ? "bg-red-600" : ready ? "bg-emerald-600" : "bg-forest"} text-white`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-widest text-white/60">
                Votre commande
              </p>
              <p className="font-display text-5xl font-bold leading-none tracking-tight">
                {order.orderNumber}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] font-bold uppercase tracking-wider text-white/55">
                Statut
              </p>
              <p className="mt-1 rounded-full bg-white/15 px-3 py-1.5 text-sm font-extrabold">
                {ORDER_STATUS[order.status]?.label || order.status}
              </p>
            </div>
          </div>
          <p className="mt-3 max-w-md text-sm font-semibold leading-snug text-white/85" aria-live="polite">
            {cancelled
              ? `Commande annulée${order.cancelReason ? ` : ${order.cancelReason}` : ""}`
              : ORDER_STATUS[order.status]?.clientLabel}
          </p>
        </div>

        <div className="grid grid-cols-2 divide-x divide-black/5 border-b border-black/5">
          <div className="p-4 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/35">
              {order.mode === "dine_in" ? "Votre table" : "Mode"}
            </p>
            <p className="mt-1 font-display text-3xl font-bold text-brand">
              {order.mode === "dine_in" ? order.tableNumber : "Emporter"}
            </p>
            {order.mode === "dine_in" ? (
              <p className="text-xs font-bold text-ink/40">à donner à la caisse</p>
            ) : (
              <p className="text-xs font-bold text-ink/40">à retirer sur place</p>
            )}
          </div>
          <div className="p-4 text-center">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-ink/35">
              Votre pseudo
            </p>
            <p className="mt-1 truncate font-display text-3xl font-bold text-brand">
              {order.customerName}
            </p>
            <p className="text-xs font-bold text-ink/40">pour retrouver la commande</p>
          </div>
        </div>

        <div className="p-5">
          {!cancelled ? (
            <ol className="relative space-y-0" aria-label="Étapes de la commande">
              {STEPS.map((step, index) => {
                const done = index < currentStep || completed;
                const current = index === currentStep && !completed;
                const Icon = step.icon;
                return (
                  <li key={step.key} className="relative flex gap-3 pb-5 last:pb-0">
                    {index < STEPS.length - 1 ? (
                      <span
                        aria-hidden="true"
                        className={`absolute left-[17px] top-9 h-[calc(100%-2.25rem)] w-0.5 ${
                          done ? "bg-brand" : "bg-stone-200"
                        }`}
                      />
                    ) : null}
                    <span
                      className={`relative z-10 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 ${
                        done
                          ? "border-brand bg-brand text-white"
                          : current
                            ? "border-brand bg-brand-soft text-brand"
                            : "border-stone-200 bg-white text-stone-300"
                      } ${current ? "animate-pulse-soft" : ""}`}
                    >
                      <Icon className="h-4 w-4" strokeWidth={2.5} />
                    </span>
                    <div className="pt-1">
                      <p
                        className={`text-sm font-extrabold ${
                          done || current ? "text-ink" : "text-ink/35"
                        }`}
                      >
                        {step.label}
                      </p>
                      <p className="text-xs text-ink/45">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          ) : (
            <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-800">
              <p className="font-bold">Motif de l'annulation</p>
              <p className="mt-1">{order.cancelReason || "Contactez la caisse pour plus d'informations."}</p>
            </div>
          )}

          {ready ? (
            <div className="mt-2 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <Store className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
              <div className="text-sm text-emerald-900">
                <p className="font-extrabold">Rendez-vous à la caisse</p>
                <p className="mt-0.5 font-medium">
                  Donnez la table {order.mode === "dine_in" ? order.tableNumber : ""} et le pseudo «{" "}
                  {order.customerName} ». Le paiement se fait sur place.
                </p>
              </div>
            </div>
          ) : null}

          {completed ? (
            <div className="mt-2 flex items-center gap-3 rounded-2xl bg-stone-100 p-4 text-sm font-semibold text-stone-700">
              <Check className="h-5 w-5 shrink-0 text-emerald-600" />
              Commande réglée. Merci et à très bientôt !
            </div>
          ) : null}

          {order.note ? (
            <p className="mt-4 rounded-xl bg-stone-50 p-3 text-xs italic text-ink/50">
              Remarque : {order.note}
            </p>
          ) : null}

          <div className="mt-5 border-t border-black/5 pt-4">
            <h2 className="font-display text-lg font-bold text-forest">Récapitulatif</h2>
            <div className="mt-2 space-y-2.5">
              {order.items.map((item) => (
                <div key={item.id} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-6 min-w-6 items-center justify-center rounded-full bg-sand px-1.5 text-xs font-extrabold text-forest">
                    {item.quantity}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-extrabold text-ink">{item.name}</p>
                    {item.options.length ? (
                      <p className="text-[11px] text-ink/45">
                        {item.options
                          .map((option) => `${option.groupName}: ${option.choiceName}`)
                          .join(" · ")}
                      </p>
                    ) : null}
                    {item.note ? (
                      <p className="text-[11px] italic text-ink/40">« {item.note} »</p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-sm font-bold">{money(item.lineTotalCents)}</p>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between rounded-2xl bg-sand/60 px-4 py-3">
              <div className="flex items-center gap-2 text-xs font-bold text-ink/50">
                <Clock3 className="h-3.5 w-3.5" />
                Envoyée à {formatTime(order.submittedAt)}
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold uppercase tracking-wide text-ink/40">
                  {order.paymentStatus === "paid" ? "Payé" : "À payer à la caisse"}
                </p>
                <p className="font-display text-2xl font-bold text-forest">
                  {money(order.totalCents)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-ink/40">
        <MapPin className="h-3.5 w-3.5" />
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

      <p className="mt-4 text-center text-[11px] leading-relaxed text-ink/35">
        {MODE_LABELS[order.mode]} · Cette page se met à jour automatiquement. Gardez ce lien pour
        suivre votre commande.
      </p>
    </div>
  );
}
