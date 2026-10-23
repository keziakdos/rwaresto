"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle,
  Bell,
  BellOff,
  Bike,
  Check,
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

const COLUMN_TONES: Record<string, { panel: string; dot: string; text: string }> = {
  submitted: { panel: "border-amber-200/70 bg-amber-50/55 dark:border-amber-900/40 dark:bg-amber-950/15", dot: "bg-amber-500", text: "text-amber-900 dark:text-amber-200" },
  in_progress: { panel: "border-sky-200/70 bg-sky-50/55 dark:border-sky-900/40 dark:bg-sky-950/15", dot: "bg-sky-500", text: "text-sky-900 dark:text-sky-200" },
  ready: { panel: "border-emerald-200/70 bg-emerald-50/55 dark:border-emerald-900/40 dark:bg-emerald-950/15", dot: "bg-emerald-500", text: "text-emerald-900 dark:text-emerald-200" },
  completed: { panel: "border-line/70 bg-sand/35 dark:border-white/10 dark:bg-white/[0.03]", dot: "bg-stone-400", text: "text-stone-700 dark:text-stone-300" },
};

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
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span className="status-dot text-emerald-600" />
            Caisse & cuisine
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Le service en direct.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            {submittedCount} à valider · {activeCount} en cours · {readyCount} prête{readyCount > 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-line/70 bg-surface px-3 py-2 text-[10px] font-extrabold text-muted shadow-card sm:flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {user.displayName}
          </span>
          {soundEnabled ? (
            <button type="button" onClick={disableSound} className="btn-secondary min-h-11 px-3.5 text-xs">
              <Volume2 className="h-4 w-4 text-emerald-600" />
              Son actif
            </button>
          ) : (
            <button type="button" onClick={enableSound} className="btn-primary min-h-11 px-3.5 text-xs">
              <BellOff className="h-4 w-4" />
              Activer le son
            </button>
          )}
          {newCount > 0 ? (
            <span className="flex h-9 min-w-9 items-center justify-center rounded-full bg-brand px-2 text-xs font-extrabold text-white shadow-glow" title="Nouvelles commandes">
              +{newCount}
            </span>
          ) : null}
          <button
            type="button"
            onClick={() => load()}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface text-muted shadow-card transition hover:text-ink"
            aria-label="Actualiser"
            title="Actualiser"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <div className="mt-4 grid grid-cols-3 gap-2 sm:max-w-xl">
        {[
          { label: "À valider", value: submittedCount, tone: "bg-amber-100 text-amber-900", dot: "bg-amber-500" },
          { label: "En cours", value: activeCount - submittedCount - readyCount, tone: "bg-sky-100 text-sky-900", dot: "bg-sky-500" },
          { label: "Prêtes", value: readyCount, tone: "bg-emerald-100 text-emerald-900", dot: "bg-emerald-500" },
        ].map((item) => (
          <div key={item.label} className="rounded-2xl border border-line/70 bg-surface px-3.5 py-2.5 shadow-card">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.12em] text-muted">
              <span className={`h-1.5 w-1.5 rounded-full ${item.dot}`} />
              {item.label}
            </p>
            <p className={`mt-1 font-display text-2xl font-semibold leading-none ${item.tone.split(" ")[1]}`}>{item.value}</p>
          </div>
        ))}
      </div>

      <div className="admin-toolbar mt-4">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Table, pseudo, numéro de commande…"
            className="h-11 w-full rounded-xl border-0 bg-sand/45 pl-10 pr-10 text-sm font-medium text-ink outline-none transition placeholder:text-muted/65 focus:bg-sand/70 focus:ring-4 focus:ring-brand/10"
            aria-label="Rechercher une commande par table, pseudo ou numéro"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-muted shadow-sm hover:text-ink"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
        <div className="flex rounded-full border border-line/70 bg-sand/40 p-1">
          <button
            type="button"
            onClick={() => setView("kanban")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition ${
              view === "kanban" ? "bg-forest text-white shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            Kanban
          </button>
          <button
            type="button"
            onClick={() => setView("tables")}
            className={`flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-extrabold transition ${
              view === "tables" ? "bg-forest text-white shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            <Table2 className="h-3.5 w-3.5" />
            Par table
          </button>
        </div>
      </div>

      {query ? (
        <p className="mt-3 text-xs font-bold text-muted">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""} pour « {query} »
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
          <button type="button" onClick={() => load()} className="ml-auto underline">
            Réessayer
          </button>
        </div>
      ) : null}

      {loading && !orders.length ? (
        <div className="mt-8 flex flex-col items-center justify-center py-16 text-sm font-bold text-muted">
          <Loader2 className="mb-3 h-7 w-7 animate-spin text-brand" />
          Chargement des commandes…
        </div>
      ) : view === "kanban" ? (
        <div className="no-scrollbar -mx-3 mt-4 flex snap-x gap-3 overflow-x-auto px-3 pb-4 sm:mx-0 sm:px-0 lg:grid lg:grid-cols-4 lg:items-start lg:overflow-visible">
          {KANBAN_COLUMNS.map((column) => {
            const columnOrders = filtered.filter((order) => order.status === column.status);
            const tone = COLUMN_TONES[column.status];
            return (
              <section
                key={column.status}
                className={`w-[84vw] max-w-[340px] shrink-0 snap-start rounded-[1.4rem] border p-2.5 sm:w-[320px] lg:w-auto lg:max-w-none ${tone.panel}`}
              >
                <header className="flex items-center justify-between gap-2 px-1.5 pb-2.5 pt-1">
                  <div className="flex items-center gap-2">
                    <span className={`flex h-8 w-8 items-center justify-center rounded-xl bg-white/80 shadow-sm ${tone.text}`}>
                      <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                    </span>
                    <div>
                      <h2 className="font-display text-base font-semibold leading-none text-ink">{column.title}</h2>
                      <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">{column.description}</p>
                    </div>
                  </div>
                  <span className={`flex h-7 min-w-7 items-center justify-center rounded-full bg-white px-2 text-xs font-extrabold shadow-sm ${tone.text}`}>
                    {columnOrders.length}
                  </span>
                </header>
                <div className="space-y-2.5">
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
                    <div className="flex flex-col items-center rounded-2xl border border-dashed border-line/80 bg-white/40 px-3 py-8 text-center">
                      <span className={`h-2 w-2 rounded-full ${tone.dot} opacity-40`} />
                      <p className="mt-2 text-[11px] font-bold text-muted/70">Aucune commande</p>
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
              <section key={groupName} className="overflow-hidden rounded-[1.4rem] border border-line/70 bg-surface shadow-card">
                <header className="flex items-center justify-between gap-2 border-b border-line/60 px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-forest-soft text-forest">
                      {groupName === "À emporter" ? <Bike className="h-4 w-4" /> : <MapPin className="h-4 w-4" />}
                    </span>
                    <div>
                      <h2 className="font-display text-lg font-semibold leading-none text-ink">{groupName}</h2>
                      <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted">
                        {groupOrders.length} commande{groupOrders.length > 1 ? "s" : ""} ·{" "}
                        {groupOrders.map((order) => order.customerName).join(", ")}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[9px] font-extrabold uppercase tracking-[0.1em] text-muted">Non encaissé</p>
                    <p className="font-display text-lg font-semibold text-brand">{money(unpaid)}</p>
                  </div>
                </header>
                <div className="divide-y divide-line/50">
                  {groupOrders.map((order) => (
                    <div key={order.id} className="flex flex-wrap items-center gap-2 px-4 py-3">
                      <span className="w-16 shrink-0 text-xs font-extrabold text-muted">
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
                            className="rounded-lg bg-forest px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-forest-light"
                          >
                            Valider
                          </button>
                        ) : null}
                        {order.status === "in_progress" ? (
                          <button
                            type="button"
                            onClick={() => act(order, "ready")}
                            className="rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-emerald-700"
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
                            className="rounded-lg bg-brand px-2.5 py-1.5 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-brand-dark"
                          >
                            Encaisser
                          </button>
                        ) : null}
                        <Link
                          href={`/admin/orders/${order.id}/ticket`}
                          target="_blank"
                          className="rounded-lg border border-line p-1.5 text-muted transition hover:bg-sand hover:text-ink"
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
            <div className="flex flex-col items-center rounded-[1.4rem] border border-dashed border-line bg-surface/50 py-16 text-center">
              <Search className="h-6 w-6 text-muted/40" />
              <p className="mt-3 text-sm font-bold text-ink">Aucune commande trouvée</p>
              <p className="mt-1 text-xs text-muted">Modifiez votre recherche ou actualisez la page.</p>
            </div>
          ) : null}
        </div>
      )}

      {modal ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            onClick={() => !actionLoading && setModal(null)}
            className="absolute inset-0 bg-[#1a120c]/55 backdrop-blur-sm"
            aria-label="Fermer"
          />
          <div className="relative w-full max-w-md animate-slide-up rounded-t-[1.8rem] border border-line/70 bg-surface p-5 shadow-lift sm:rounded-[1.8rem]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${
                  modal.kind === "cancel" ? "bg-red-100 text-red-700" : "bg-brand-soft text-brand-dark"
                }`}>
                  {modal.kind === "cancel" ? <X className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                </span>
                <div>
                  <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand">
                    {modal.order.orderNumber} ·{" "}
                    {modal.order.mode === "dine_in" ? `Table ${modal.order.tableNumber}` : "À emporter"}
                  </p>
                  <h2 className="mt-0.5 font-display text-xl font-semibold text-ink">
                    {modal.kind === "cancel" ? "Annuler la commande" : "Encaisser la commande"}
                  </h2>
                  <p className="mt-0.5 text-xs font-semibold text-muted">
                    {modal.order.customerName} · <strong className="text-ink">{money(modal.order.totalCents)}</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModal(null)}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-sand hover:text-ink"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {modal.kind === "cancel" ? (
              <div className="mt-5">
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
                <p className="mt-2 rounded-xl border border-amber-200/70 bg-amber-50 p-2.5 text-[11px] font-semibold text-amber-800">
                  Le client verra immédiatement le statut « Annulée » et ce motif.
                </p>
              </div>
            ) : (
              <div className="mt-5">
                <p className="admin-label">Mode de paiement reçu</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-sm font-extrabold transition ${
                      paymentMethod === "cash"
                        ? "border-brand bg-brand-soft text-brand-dark shadow-sm"
                        : "border-line text-muted hover:border-brand/30"
                    }`}
                  >
                    <Wallet className="h-5 w-5" />
                    Espèces
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("card")}
                    className={`flex flex-col items-center gap-1.5 rounded-2xl border-2 py-4 text-sm font-extrabold transition ${
                      paymentMethod === "card"
                        ? "border-brand bg-brand-soft text-brand-dark shadow-sm"
                        : "border-line text-muted hover:border-brand/30"
                    }`}
                  >
                    <CreditCard className="h-5 w-5" />
                    Carte
                  </button>
                </div>
                <p className="mt-3 rounded-xl bg-sand/50 p-2.5 text-[11px] font-semibold text-muted">
                  Confirmez uniquement après avoir reçu le paiement. Cette action clôture la commande.
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
                {modal.kind === "cancel" ? "Confirmer" : "Valider"}
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
  const count = order.items.reduce((sum, item) => sum + item.quantity, 0);
  const statusTone = ORDER_STATUS[order.status].color;

  return (
    <article className="overflow-hidden rounded-[1.2rem] border border-line/60 bg-surface shadow-card transition hover:shadow-soft">
      <div className="flex items-start justify-between gap-2 border-b border-line/50 px-3.5 py-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-display text-lg font-semibold leading-none text-ink">
              {order.orderNumber}
            </span>
            <span className="rounded-full bg-sand px-2 py-0.5 text-[9px] font-extrabold text-muted">
              {order.mode === "dine_in" ? `Table ${order.tableNumber}` : "À emporter"}
            </span>
          </div>
          <p className="mt-1.5 truncate text-xs font-extrabold text-brand">{order.customerName}</p>
        </div>
        <div className="shrink-0 text-right">
          <p className={`inline-flex rounded-full border px-2 py-0.5 text-[9px] font-extrabold ${statusTone}`}>
            {ORDER_STATUS[order.status].label}
          </p>
          <p className="mt-1 text-[9px] font-bold text-muted">{timeAgo(order.submittedAt, now)}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        className="flex w-full items-center justify-between gap-2 px-3.5 py-2.5 text-left transition hover:bg-sand/30"
        aria-expanded={expanded}
      >
        <span className="text-[10px] font-bold text-muted">
          {count} article{count > 1 ? "s" : ""} · <strong className="font-extrabold text-ink">{money(order.totalCents)}</strong>
        </span>
        <span className="flex items-center gap-1.5">
          {!active && order.completedAt ? (
            <span className="text-[8px] font-bold text-muted/60">{formatDateTime(order.completedAt)}</span>
          ) : null}
          <ChevronDown className={`h-3.5 w-3.5 text-muted transition ${expanded ? "rotate-180" : ""}`} />
        </span>
      </button>

      {expanded ? (
        <div className="space-y-2.5 border-t border-line/50 bg-sand/20 px-3.5 py-3">
          {order.items.map((item) => (
            <div key={item.id} className="group flex items-start gap-2">
              <span className="mt-0.5 flex h-5 min-w-5 items-center justify-center rounded-md bg-forest text-[9px] font-extrabold text-white">
                {item.quantity}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-extrabold leading-tight text-ink">{item.nameSnapshot}</p>
                {item.options.length ? (
                  <p className="mt-0.5 text-[9px] leading-snug text-muted">
                    {item.options.map((option) => option.choiceNameSnapshot).join(" · ")}
                  </p>
                ) : null}
                {item.note ? (
                  <p className="mt-0.5 text-[9px] font-semibold italic text-brand/80">« {item.note} »</p>
                ) : null}
              </div>
              <span className="text-[9px] font-bold text-muted">{money(item.lineTotalCents)}</span>
              {order.status === "submitted" ? (
                <button
                  type="button"
                  onClick={() => onRemoveItem(item)}
                  className="rounded-md p-1 text-muted/40 transition hover:bg-red-50 hover:text-red-600"
                  aria-label={`Retirer ${item.nameSnapshot}`}
                  title="Retirer cet article"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              ) : null}
            </div>
          ))}
          {order.note ? (
            <p className="rounded-xl border border-amber-200/70 bg-amber-50 p-2 text-[9px] font-semibold text-amber-900">
              Note : {order.note}
            </p>
          ) : null}
          {order.phone ? (
            <p className="text-[9px] font-bold text-muted">Tél. {order.phone}</p>
          ) : null}
          {order.cancelReason ? (
            <p className="rounded-xl border border-red-200 bg-red-50 p-2 text-[9px] font-semibold text-red-700">
              Motif : {order.cancelReason}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-2 gap-y-1 border-t border-line/50 pt-2 text-[8px] font-bold uppercase tracking-[0.06em] text-muted/70">
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

      {active ? (
        <div className="flex flex-wrap gap-1.5 border-t border-line/50 px-3 py-2.5">
          {order.status === "submitted" ? (
            <>
              <button type="button" onClick={onValidate} disabled={actionLoading} className="btn-primary min-h-9 flex-1 rounded-xl px-2 text-[11px]">
                <Check className="h-3.5 w-3.5" />
                Valider
              </button>
              <button type="button" onClick={onCancel} disabled={actionLoading} className="btn-ghost min-h-9 rounded-xl border border-red-200 px-2.5 text-[11px] text-red-600 hover:bg-red-50">
                Refuser
              </button>
            </>
          ) : null}
          {order.status === "in_progress" ? (
            <>
              <button type="button" onClick={onReady} disabled={actionLoading} className="min-h-9 flex-1 rounded-xl bg-emerald-600 px-2 text-[11px] font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-50">
                <Bell className="mr-1 inline h-3 w-3" />
                Prête
              </button>
              <button type="button" onClick={onCancel} disabled={actionLoading} className="btn-ghost min-h-9 rounded-xl border border-red-200 px-2.5 text-[11px] text-red-600 hover:bg-red-50">
                Annuler
              </button>
            </>
          ) : null}
          {order.status === "ready" ? (
            <>
              <button type="button" onClick={onPay} disabled={actionLoading} className="btn-primary min-h-9 flex-1 rounded-xl px-2 text-[11px]">
                <Wallet className="h-3.5 w-3.5" />
                Encaisser
              </button>
              <button type="button" onClick={onCancel} disabled={actionLoading} className="btn-ghost min-h-9 rounded-xl border border-red-200 px-2.5 text-[11px] text-red-600 hover:bg-red-50">
                Annuler
              </button>
            </>
          ) : null}
          <Link
            href={`/admin/orders/${order.id}/ticket`}
            target="_blank"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-line text-muted transition hover:bg-sand hover:text-ink"
            aria-label={`Imprimer le ticket ${order.orderNumber}`}
            title="Imprimer le ticket"
          >
            <Printer className="h-3.5 w-3.5" />
          </Link>
        </div>
      ) : null}

      {order.status === "cancelled" ? (
        <p className="border-t border-red-100 bg-red-50 px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-red-700">Annulée</p>
      ) : null}
      {order.status === "completed" ? (
        <p className="border-t border-emerald-100 bg-emerald-50 px-3.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.08em] text-emerald-700">
          Encaissée · {order.paymentMethod ? PAYMENT_METHODS[order.paymentMethod as "cash" | "card"] : ""}
        </p>
      ) : null}
    </article>
  );
}
