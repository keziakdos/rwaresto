"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  BellOff,
  Bike,
  Check,
  ChefHat,
  ChevronDown,
  CreditCard,
  LayoutGrid,
  Loader2,
  MapPin,
  Printer,
  RefreshCw,
  Search,
  Table2,
  Trash2,
  Volume2,
  Wallet,
  X,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import {
  ACTIVE_STATUSES,
  KANBAN_COLUMNS,
  ORDER_STATUS,
  PAYMENT_METHODS,
  type OrderStatus,
} from "@/lib/constants";
import { formatDateTime, timeAgo } from "@/lib/format";
import { normalizeName } from "@/lib/normalize";
import { useMoney } from "../site-provider";
import { useToast } from "../toast-provider";

type OrderItem = {
  id: string;
  nameSnapshot: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  note: string | null;
  options: { id: string; groupNameSnapshot: string; choiceNameSnapshot: string; priceDeltaCents: number }[];
};

type AdminOrder = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  mode: "dine_in" | "takeaway";
  tableNumber: number | null;
  customerName: string;
  phone: string | null;
  note: string | null;
  cancelReason: string | null;
  subtotalCents: number;
  totalCents: number;
  paymentStatus: "unpaid" | "paid";
  paymentMethod: string | null;
  submittedAt: string;
  completedAt: string | null;
  items: OrderItem[];
  validatedBy?: { displayName: string } | null;
  readyBy?: { displayName: string } | null;
  paidBy?: { displayName: string } | null;
};

type Modal = { kind: "cancel" | "pay"; order: AdminOrder } | null;

function beep() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const context = new AudioContextClass();
    const notes = [880, 1174, 880];
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, context.currentTime + index * 0.18);
      gain.gain.exponentialRampToValueAtTime(0.22, context.currentTime + index * 0.18 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + index * 0.18 + 0.24);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime + index * 0.18);
      oscillator.stop(context.currentTime + index * 0.18 + 0.26);
    });
    setTimeout(() => context.close().catch(() => undefined), 1200);
  } catch {
    // Le son est optionnel.
  }
}

export function OrdersBoard({ user }: { user: SessionUser }) {
  const money = useMoney();
  const toast = useToast();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [view, setView] = useState<"kanban" | "tables">("kanban");
  const [modal, setModal] = useState<Modal>(null);
  const [reason, setReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card">("cash");
  const [actionLoading, setActionLoading] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [now, setNow] = useState(Date.now());
  const soundRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const response = await fetch("/api/admin/orders?scope=board", { cache: "no-store" });
      if (!response.ok) throw new Error("load");
      const data = await response.json();
      setOrders(data.orders || []);
      setError("");
    } catch {
      if (!silent) setError("Impossible de charger les commandes.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const stored = localStorage.getItem("rwaresto_sound_enabled") === "1";
    setSoundEnabled(stored);
    soundRef.current = stored;
    const interval = setInterval(() => load(true), 15000);
    const clock = setInterval(() => setNow(Date.now()), 30000);
    return () => {
      clearInterval(interval);
      clearInterval(clock);
    };
  }, [load]);

  useEffect(() => {
    const source = new EventSource("/api/admin/events");
    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat") return;
        if (data.type === "order.created") {
          if (soundRef.current) beep();
          setNewCount((count) => count + 1);
          toast.show({
            message: `Nouvelle commande ${data.orderNumber || ""} · ${
              data.tableNumber ? `Table ${data.tableNumber}` : "À emporter"
            } · ${data.customerName || ""}`,
            type: "info",
          });
        }
        load(true);
      } catch {
        // ignore
      }
    };
    source.onerror = () => source.close();
    return () => source.close();
  }, [load, toast]);

  useEffect(() => {
    const onFocus = () => setNewCount(0);
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  function enableSound() {
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioContextRef.current?.close().catch(() => undefined);
      audioContextRef.current = new AudioContextClass();
      audioContextRef.current.resume().catch(() => undefined);
    } catch {
      // ignore
    }
    soundRef.current = true;
    setSoundEnabled(true);
    localStorage.setItem("rwaresto_sound_enabled", "1");
    beep();
    toast.show({ message: "Son des nouvelles commandes activé.", type: "success" });
  }

  function disableSound() {
    soundRef.current = false;
    setSoundEnabled(false);
    localStorage.setItem("rwaresto_sound_enabled", "0");
    toast.show({ message: "Son désactivé.", type: "info" });
  }

  const filtered = useMemo(() => {
    const term = query.trim();
    if (!term) return orders;
    const normalized = normalizeName(term);
    const numeric = /^\d+$/.test(term) ? Number(term) : null;
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(term.toLowerCase()) ||
        normalizeName(order.customerName).includes(normalized) ||
        (numeric !== null && order.tableNumber === numeric) ||
        (order.phone || "").includes(term),
    );
  }, [orders, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, AdminOrder[]>();
    for (const order of filtered) {
      const key =
        order.mode === "dine_in" && order.tableNumber
          ? `Table ${order.tableNumber}`
          : "À emporter";
      const list = map.get(key) || [];
      list.push(order);
      map.set(key, list);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b, "fr", { numeric: true }));
  }, [filtered]);

  async function act(order: AdminOrder, action: "validate" | "ready" | "complete" | "cancel", extra?: Record<string, unknown>) {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/orders/${order.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...extra }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.show({ message: data.error || "Action impossible.", type: "error" });
        return false;
      }
      const labels = {
        validate: "Commande validée, en préparation.",
        ready: "Commande déclarée prête. Le client est prévenu.",
        complete: "Commande encaissée et terminée.",
        cancel: "Commande annulée.",
      };
      toast.show({ message: labels[action], type: "success" });
      setModal(null);
      await load(true);
      return true;
    } catch {
      toast.show({ message: "Connexion impossible.", type: "error" });
      return false;
    } finally {
      setActionLoading(false);
    }
  }

  async function removeItem(order: AdminOrder, item: OrderItem) {
    if (!window.confirm(`Retirer « ${item.nameSnapshot} » de la commande ${order.orderNumber} ?`)) {
      return;
    }
    const response = await fetch(`/api/admin/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ removeItemIds: [item.id] }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Modification impossible.", type: "error" });
      return;
    }
    toast.show({ message: "Article retiré, total recalculé.", type: "success" });
    load(true);
  }

  async function submitModal() {
    if (!modal) return;
    if (modal.kind === "cancel") {
      if (!reason.trim()) {
        toast.show({ message: "Indiquez le motif d'annulation.", type: "error" });
        return;
      }
      await act(modal.order, "cancel", { reason: reason.trim() });
    } else {
      await act(modal.order, "complete", { paymentMethod });
    }
  }

  const activeCount = orders.filter((order) => ACTIVE_STATUSES.includes(order.status)).length;
  const readyCount = orders.filter((order) => order.status === "ready").length;
  const submittedCount = orders.filter((order) => order.status === "submitted").length;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Caisse & cuisine</p>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Commandes</h1>
          <p className="mt-1 text-sm text-stone-500">
            {submittedCount} à valider · {activeCount} active{activeCount > 1 ? "s" : ""} ·{" "}
            {readyCount} prête{readyCount > 1 ? "s" : ""}
            <span className="hidden sm:inline"> · {user.displayName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {soundEnabled ? (
            <button type="button" onClick={disableSound} className="btn-secondary min-h-10 px-3 text-xs">
              <Volume2 className="h-4 w-4 text-emerald-600" />
              Son actif
            </button>
          ) : (
            <button type="button" onClick={enableSound} className="btn-primary min-h-10 px-3 text-xs">
              <BellOff className="h-4 w-4" />
              Activer le son
            </button>
          )}
          {newCount > 0 ? (
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-brand px-2 text-xs font-extrabold text-white">
              +{newCount}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => load()}
            className="btn-ghost min-h-10 px-2"
            aria-label="Actualiser"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher : numéro de table, pseudo ou commande…"
            className="field h-11 rounded-full pl-10 pr-10 text-sm"
            aria-label="Rechercher une commande par table, pseudo ou numéro"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex rounded-full bg-stone-200/70 p-1">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${
              view === "kanban" ? "bg-white text-forest shadow-sm" : "text-stone-500"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("tables")}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${
              view === "tables" ? "bg-white text-forest shadow-sm" : "text-stone-500"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Par table
          </button>
        </div>
      </div>

      {query ? (
        <p className="mt-2 text-xs font-bold text-stone-500">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""} pour « {query} »
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
          <AlertCircle className="h-4 w-4" />
          {error}
          <button type="button" onClick={() => load()} className="ml-auto underline">
            Réessayer
          </button>
        </div>
      ) : null}

      {loading && !orders.length ? (
        <div className="mt-6 flex items-center justify-center py-16 text-sm font-bold text-stone-400">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Chargement des commandes…
        </div>
      ) : view === "kanban" ? (
        <div className="no-scrollbar -mx-3 mt-4 flex snap-x gap-3 overflow-x-auto px-3 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:overflow-visible">
          {KANBAN_COLUMNS.map((column) => {
            const columnOrders = filtered.filter((order) => order.status === column.status);
            return (
              <section
                key={column.status}
                className="w-[84vw] max-w-[340px] shrink-0 snap-start rounded-2xl bg-stone-200/45 p-2 sm:w-[320px] lg:w-auto lg:max-w-none"
              >
                <header className="flex items-center justify-between px-2 py-2">
                  <div>
                    <h2 className="font-display text-base font-bold text-stone-800">{column.title}</h2>
                    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                      {column.description}
                    </p>
                  </div>
                  <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-xs font-extrabold text-stone-600">
                    {columnOrders.length}
                  </span>
                </header>
                <div className="space-y-2">
                  {columnOrders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      now={now}
                      money={money}
                      actionLoading={actionLoading}
                      onValidate={() => act(order, "validate")}
                      onReady={() => act(order, "ready")}
                      onPay={() => {
                        setPaymentMethod("cash");
                        setModal({ kind: "pay", order });
                      }}
                      onCancel={() => {
                        setReason("");
                        setModal({ kind: "cancel", order });
                      }}
                      onRemoveItem={(item) => removeItem(order, item)}
                    />
                  ))}
                  {!columnOrders.length ? (
                    <div className="rounded-xl border border-dashed border-stone-300 px-3 py-7 text-center text-xs font-semibold text-stone-400">
                      Aucune commande
                    </div>
                  ) : null}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {grouped.map(([groupName, groupOrders]) => {
            const unpaid = groupOrders
              .filter((order) => order.paymentStatus === "unpaid" && order.status !== "cancelled")
              .reduce((sum, order) => sum + order.totalCents, 0);
            return (
              <section key={groupName} className="rounded-2xl border border-black/5 bg-white p-3 shadow-card">
                <header className="flex items-center justify-between gap-2 border-b border-black/5 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest/10 text-forest">
                      {groupName === "À emporter" ? <Bike className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-bold text-forest">{groupName}</h2>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                        {groupOrders.length} commande{groupOrders.length > 1 ? "s" : ""} ·{" "}
                        {groupOrders.map((order) => order.customerName).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold uppercase text-stone-400">Non encaissé</p>
                    <p className="font-extrabold text-brand">{money(unpaid)}</p>
                  </div>
                </header>
                <div className="mt-2 divide-y divide-black/5">
                  {groupOrders.map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center gap-2 py-2.5">
                      <span className="w-16 shrink-0 text-xs font-extrabold text-stone-500">
                        {order.orderNumber}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm font-extrabold text-ink">
                        {order.customerName}
                      </span>
                      <span className={`badge border ${ORDER_STATUS[order.status].color}`}>
                        {ORDER_STATUS[order.status].label}
                      </span>
                      <span
                        className={`badge ${
                          order.paymentStatus === "paid"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {order.paymentStatus === "paid" ? "Payé" : "Non payé"}
                      </span>
                      <span className="w-20 text-right text-sm font-extrabold">
                        {money(order.totalCents)}
                      </span>
                      <div className="flex gap-1">
                        {order.status === "submitted" ? (
                          <button
                            type="button"
                            onClick={() => act(order, "validate")}
                            className="rounded-lg bg-forest px-2.5 py-1.5 text-[11px] font-extrabold text-white"
                          >
                            Valider
                          </button>
                        ) : null}
                        {order.status === "in_progress" ? (
                          <button
                            type="button"
                            onClick={() => act(order, "ready")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white"
                          >
                            Prête
                          </button>
                        ) : null}
                        {order.status === "ready" ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPaymentMethod("cash");
                              setModal({ kind: "pay", order });
                            }}
                            className="rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-extrabold text-white"
                          >
                            Encaisser
                          </button>
                        ) : null}
                        <Link
                          href={`/admin/orders/${order.id}/ticket`}
                          target="_blank"
                          className="rounded-lg border border-stone-200 p-1.5 text-stone-500 hover:bg-stone-50"
                          aria-label="Imprimer le ticket"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
          {!grouped.length ? (
            <div className="rounded-2xl border border-dashed border-stone-300 bg-white/50 py-14 text-center text-sm font-semibold text-stone-400">
              Aucune commande pour cette recherche.
            </div>
          ) : null}
        </div>
      )}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => !actionLoading && setModal(null)}
            className="absolute inset-0 bg-stone-950/45 backdrop-blur-[2px]"
            aria-label="Fermer"
          />
          <div className="relative w-full max-w-md rounded-3xl bg-white p-5 shadow-soft animate-slide-up">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-widest text-brand">
                  {modal.order.orderNumber} ·{" "}
                  {modal.order.mode === "dine_in" ? `Table ${modal.order.tableNumber}` : "À emporter"}
                </p>
                <h2 className="font-display text-xl font-bold text-forest">
                  {modal.kind === "cancel" ? "Annuler la commande" : "Encaisser la commande"}
                </h2>
                <p className="mt-0.5 text-sm font-semibold text-stone-500">
                  {modal.order.customerName} · {money(modal.order.totalCents)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="rounded-full p-2 text-stone-400 hover:bg-stone-100"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modal.kind === "cancel" ? (
              <div className="mt-4">
                <label htmlFor="cancel-reason" className="admin-label">
                  Motif communiqué au client
                </label>
                <textarea
                  id="cancel-reason"
                  value={reason}
                  onChange={(event) => setReason(event.target.value.slice(0, 300))}
                  rows={3}
                  className="field resize-none"
                  placeholder="Ex. plat épuisé, erreur de commande…"
                  autoFocus
                />
                <p className="mt-2 rounded-xl bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-800">
                  Le client verra immédiatement le statut « Annulée » et ce motif.
                </p>
              </div>
            ) : (
              <div className="mt-4">
                <p className="admin-label">Mode de paiement reçu</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-sm font-extrabold ${
                      paymentMethod === "cash"
                        ? "border-brand bg-brand-soft text-brand-dark"
                        : "border-stone-200 text-stone-500"
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                    Espèces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-sm font-extrabold ${
                      paymentMethod === "card"
                        ? "border-brand bg-brand-soft text-brand-dark"
                        : "border-stone-200 text-stone-500"
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    Carte
                  </button>
                </div>
                <p className="mt-3 rounded-xl bg-stone-50 p-2.5 text-[11px] font-semibold text-stone-500">
                  Confirmez uniquement après avoir reçu le paiement. Cette action clôture la
                  commande.
                </p>
              </div>
            )}

            <div className="mt-5 flex gap-2">
              <button type="button" onClick={() => setModal(null)} disabled={actionLoading} className="btn-secondary flex-1">
                Retour
              </button>
              <button
                type="button"
                onClick={submitModal}
                disabled={actionLoading}
                className={`flex-1 ${modal.kind === "cancel" ? "btn-danger" : "btn-primary"}`}
              >
                {actionLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : modal.kind === "cancel" ? (
                  <X className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                {modal.kind === "cancel" ? "Confirmer l'annulation" : "Valider l'encaissement"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrderCard({
  order,
  now,
  money,
  actionLoading,
  onValidate,
  onReady,
  onPay,
  onCancel,
  onRemoveItem,
}: {
  order: AdminOrder;
  now: number;
  money: (cents: number) => string;
  actionLoading: boolean;
  onValidate: () => void;
  onReady: () => void;
  onPay: () => void;
  onCancel: () => void;
  onRemoveItem: (item: OrderItem) => void;
}) {
  const [expanded, setExpanded] = useState(order.status === "submitted");
  const active = ["submitted", "in_progress", "ready"].includes(order.status);

  return (
    <article className="overflow-hidden rounded-xl border border-black/5 bg-white shadow-sm">
      <div className="flex items-start justify-between gap-2 border-b border-black/5 px-3 py-2.5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-lg font-bold leading-none text-forest">
              {order.orderNumber}
            </span>
            <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-extrabold text-stone-600">
              {order.mode === "dine_in" ? `Table ${order.tableNumber}` : "À emporter"}
            </span>
          </div>
          <p className="mt-1 truncate text-sm font-extrabold text-brand">{order.customerName}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-extrabold text-stone-500">{timeAgo(order.submittedAt, now)}</p>
          {active ? (
            <p className="flex items-center justify-end gap-1 text-[10px] font-semibold text-stone-400">
              <ChefHat className="h-3 w-3" />
              en cours
            </p>
          ) : (
            <p className="text-[10px] font-semibold text-stone-400">
              {order.completedAt ? formatDateTime(order.completedAt) : ""}
            </p>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
        aria-expanded={expanded}
      >
        <span className="text-[11px] font-bold text-stone-500">
          {order.items.reduce((sum, item) => sum + item.quantity, 0)} article
          {order.items.reduce((sum, item) => sum + item.quantity, 0) > 1 ? "s" : ""} ·{" "}
          {money(order.totalCents)}
        </span>
        <ChevronDown className={`h-3.5 w-3.5 text-stone-400 transition ${expanded ? "rotate-180" : ""}`} />
      </button>

      {expanded ? (
        <div className="space-y-2 border-t border-black/5 px-3 py-2.5">
          {order.items.map((item) => (
            <div key={item.id} className="group flex items-start gap-2">
              <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-sand text-[10px] font-extrabold text-forest">
                {item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-extrabold leading-tight text-ink">{item.nameSnapshot}</p>
                {item.options.length ? (
                  <p className="text-[10px] leading-snug text-stone-400">
                    {item.options.map((option) => option.choiceNameSnapshot).join(" · ")}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="text-[10px] font-semibold italic text-brand/70">« {item.note} »</p>
                ) : null}
              </div>
              <span className="text-[10px] font-bold text-stone-500">{money(item.lineTotalCents)}</span>
              {order.status === "submitted" ? (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item)}
                  className="rounded p-1 text-stone-300 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Retirer ${item.nameSnapshot}`}
                  title="Retirer cet article"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
          {order.note ? (
            <p className="rounded-lg bg-amber-50 p-2 text-[10px] font-semibold text-amber-800">
              Note : {order.note}
            </p>
          ) : null}
          {order.phone ? (
            <p className="text-[10px] font-semibold text-stone-400">Tél. {order.phone}</p>
          ) : null}
          {order.cancelReason ? (
            <p className="rounded-lg bg-red-50 p-2 text-[10px] font-semibold text-red-700">
              Motif : {order.cancelReason}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2 border-t border-black/5 pt-2 text-[9px] font-semibold uppercase tracking-wide text-stone-400">
            {order.validatedBy ? <span>Validée : {order.validatedBy.displayName}</span> : null}
            {order.readyBy ? <span>Prête : {order.readyBy.displayName}</span> : null}
            {order.paidBy ? (
              <span>
                Encaissée : {order.paidBy.displayName}
                {order.paymentMethod ? ` (${PAYMENT_METHODS[order.paymentMethod as "cash" | "card"]})` : ""}
              </span>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 border-t border-black/5 px-3 py-2">
        {order.status === "submitted" ? (
          <>
            <button
              type="button"
              onClick={onValidate}
              disabled={actionLoading}
              className="flex-1 rounded-lg bg-forest px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              Valider
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={actionLoading}
              className="rounded-lg border border-red-200 px-2 py-2 text-xs font-extrabold text-red-600 disabled:opacity-50"
            >
              Refuser
            </button>
          </>
        ) : null}
        {order.status === "in_progress" ? (
          <>
            <button
              type="button"
              onClick={onReady}
              disabled={actionLoading}
              className="flex-1 rounded-lg bg-emerald-600 px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              <Bell className="mr-1 inline h-3 w-3" />
              Prête
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={actionLoading}
              className="rounded-lg border border-red-200 px-2 py-2 text-xs font-extrabold text-red-600 disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        ) : null}
        {order.status === "ready" ? (
          <>
            <button
              type="button"
              onClick={onPay}
              disabled={actionLoading}
              className="flex-1 rounded-lg bg-brand px-2 py-2 text-xs font-extrabold text-white disabled:opacity-50"
            >
              <Wallet className="mr-1 inline h-3 w-3" />
              Encaisser
            </button>
            <button
              type="button"
              onClick={onCancel}
              disabled={actionLoading}
              className="rounded-lg border border-red-200 px-2 py-2 text-xs font-extrabold text-red-600 disabled:opacity-50"
            >
              Annuler
            </button>
          </>
        ) : null}
        <Link
          href={`/admin/orders/${order.id}/ticket`}
          target="_blank"
          className="flex items-center justify-center rounded-lg border border-stone-200 px-2 py-2 text-stone-400 hover:bg-stone-50 hover:text-stone-700"
          aria-label={`Imprimer le ticket ${order.orderNumber}`}
          title="Imprimer le ticket"
        >
          <Printer className="h-3.5 w-3.5" />
        </Link>
      </div>
      {order.status === "cancelled" ? (
        <p className="bg-red-50 px-3 py-1.5 text-[10px] font-bold text-red-700">Annulée</p>
      ) : null}
      {order.status === "completed" ? (
        <p className="bg-emerald-50 px-3 py-1.5 text-[10px] font-bold text-emerald-700">
          Encaissée · {order.paymentMethod ? PAYMENT_METHODS[order.paymentMethod as "cash" | "card"] : ""}
        </p>
      ) : null}
    </article>
  );
}
