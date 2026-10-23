"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bike,
  CheckCircle2,
  ChevronRight,
  Minus,
  Pencil,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  ShoppingBag,
  Store,
  Trash2,
  UserRound,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  getClientId,
  getSavedName,
  saveName,
  trackOrder,
  useCart,
  type CartLine,
} from "./cart-provider";
import { useMoney, useSite } from "./site-provider";
import { useToast } from "./toast-provider";
import { EmptyState } from "./ui/empty-state";

export function CartDrawer({
  open,
  onClose,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  onEdit: (line: CartLine) => void;
}) {
  const cart = useCart();
  const site = useSite();
  const money = useMoney();
  const toast = useToast();
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [note, setNote] = useState("");
  const [table, setTable] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const idempotencyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName((current) => current || getSavedName());
    setTable(cart.tableNumber ? String(cart.tableNumber) : "");
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, cart.tableNumber, loading, onClose]);

  useEffect(() => {
    if (cart.count === 0) idempotencyRef.current = null;
  }, [cart.count]);

  if (!open) return null;

  async function submitOrder() {
    setError("");
    if (!site.isOpen) {
      setError(site.closedReason || "Les commandes sont fermées.");
      return;
    }
    if (!cart.lines.length) {
      setError("Votre panier est vide.");
      return;
    }
    if (!name.trim()) {
      setError("Indiquez votre prénom ou pseudo.");
      return;
    }
    if (cart.mode === "dine_in") {
      if (!table.trim() || !/^\d+$/.test(table.trim())) {
        setError("Indiquez le numéro de votre table.");
        return;
      }
    }

    setLoading(true);
    try {
      if (!idempotencyRef.current) idempotencyRef.current = crypto.randomUUID();
      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: cart.mode,
          tableNumber: cart.mode === "dine_in" ? Number(table) : null,
          customerName: name.trim(),
          phone: phone.trim() || undefined,
          note: note.trim() || undefined,
          clientId: getClientId(),
          idempotencyKey: idempotencyRef.current,
          items: cart.lines.map((line) => ({
            productId: line.productId,
            quantity: line.quantity,
            choiceIds: line.options.map((option) => option.choiceId),
            note: line.note || undefined,
          })),
        }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.error || "Impossible d'envoyer la commande.");
        return;
      }

      saveName(name.trim());
      cart.setTableNumber(cart.mode === "dine_in" ? Number(table) : null);
      trackOrder({
        id: data.id,
        token: data.publicToken,
        orderNumber: data.orderNumber,
        status: data.status,
        createdAt: new Date().toISOString(),
      });
      cart.clearCart();
      toast.show({ message: `Commande ${data.orderNumber} envoyée à la cuisine.`, type: "success" });
      onClose();
      router.push(`/commande/${data.id}?t=${data.publicToken}`);
    } catch {
      setError("Connexion impossible. Vérifiez votre réseau et réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Votre panier"
    >
      <button
        type="button"
        onClick={() => !loading && onClose()}
        aria-label="Fermer le panier"
        className="absolute inset-0 animate-fade-in bg-stone-950/60 backdrop-blur-[3px]"
      />
      <div className="relative flex max-h-[95dvh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-soft sm:rounded-[2rem]">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-line/70 bg-surface px-4 py-4 sm:px-5">
          <div className="flex items-center gap-3">
            <span className="relative flex h-11 w-11 items-center justify-center rounded-2xl bg-forest text-white">
              <ShoppingBag className="h-5 w-5" />
              {cart.count ? (
                <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold text-white">
                  {cart.count}
                </span>
              ) : null}
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Votre panier</h2>
              <p className="text-[11px] font-semibold text-muted">
                {cart.count} article{cart.count > 1 ? "s" : ""} · {money(cart.subtotalCents)}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sand text-muted transition hover:text-ink"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {cart.lines.length === 0 ? (
            <EmptyState
              icon={ShoppingBag}
              title="Votre panier est vide"
              description="Parcourez la carte et ajoutez vos plats préférés."
              action={
                <button type="button" onClick={onClose} className="btn-secondary">
                  <UtensilsCrossed className="h-4 w-4" />
                  Retour au menu
                </button>
              }
            />
          ) : (
            <div className="space-y-2.5">
              {cart.lines.map((line) => (
                <div key={line.key} className="flex gap-3 rounded-[1.25rem] border border-line/70 bg-surface p-2.5 shadow-card sm:p-3">
                  {line.image ? (
                    <Image
                      src={line.image}
                      alt=""
                      width={84}
                      height={84}
                      className="h-20 w-20 shrink-0 rounded-2xl object-cover sm:h-[84px] sm:w-[84px]"
                    />
                  ) : (
                    <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-sand">
                      <Image src="/logo.png" alt="" width={40} height={40} className="opacity-30" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-extrabold leading-tight text-ink">{line.name}</p>
                      <p className="shrink-0 text-sm font-extrabold tabular-nums text-forest">
                        {money(line.unitPriceCents * line.quantity)}
                      </p>
                    </div>
                    {line.options.length ? (
                      <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted">
                        {line.options.map((option) => option.choiceName).join(" · ")}
                      </p>
                    ) : null}
                    {line.note ? (
                      <p className="mt-0.5 truncate text-[11px] italic text-muted/75">« {line.note} »</p>
                    ) : null}
                    <div className="mt-2.5 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-full border border-line bg-sand/45 p-0.5">
                        <button
                          type="button"
                          onClick={() => cart.updateQuantity(line.key, line.quantity - 1)}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink/65 transition hover:bg-surface"
                          aria-label={`Diminuer ${line.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-extrabold tabular-nums">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => cart.updateQuantity(line.key, line.quantity + 1)}
                          disabled={line.quantity >= 20}
                          className="flex h-7 w-7 items-center justify-center rounded-full text-ink/65 transition hover:bg-surface disabled:opacity-30"
                          aria-label={`Augmenter ${line.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-0.5">
                        <button
                          type="button"
                          onClick={() => onEdit(line)}
                          className="flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-bold text-forest transition hover:bg-forest/5"
                        >
                          <Pencil className="h-3 w-3" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => cart.removeItem(line.key)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-red-600 transition hover:bg-red-50"
                          aria-label={`Supprimer ${line.name}`}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {cart.lines.length ? (
            <div className="mt-5 space-y-4">
              <div>
                <p className="mb-2 text-sm font-extrabold text-ink">Comment souhaitez-vous être servi ?</p>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => cart.setMode("dine_in")}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                      cart.mode === "dine_in"
                        ? "border-brand bg-brand-soft/60"
                        : "border-line bg-surface hover:border-brand/30"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cart.mode === "dine_in" ? "bg-brand text-white" : "bg-sand text-forest"}`}>
                      <Store className="h-4 w-4" />
                    </span>
                    <span>
                      <span className={`block text-sm font-extrabold ${cart.mode === "dine_in" ? "text-brand-dark" : "text-ink"}`}>Sur place</span>
                      <span className="block text-[10px] text-muted">À table</span>
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => cart.setMode("takeaway")}
                    className={`flex items-center gap-3 rounded-2xl border-2 p-3.5 text-left transition ${
                      cart.mode === "takeaway"
                        ? "border-brand bg-brand-soft/60"
                        : "border-line bg-surface hover:border-brand/30"
                    }`}
                  >
                    <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${cart.mode === "takeaway" ? "bg-brand text-white" : "bg-sand text-forest"}`}>
                      <Bike className="h-4 w-4" />
                    </span>
                    <span>
                      <span className={`block text-sm font-extrabold ${cart.mode === "takeaway" ? "text-brand-dark" : "text-ink"}`}>À emporter</span>
                      <span className="block text-[10px] text-muted">Au comptoir</span>
                    </span>
                  </button>
                </div>
              </div>

              {cart.mode === "dine_in" ? (
                <div>
                  <label htmlFor="cart-table" className="label">
                    Numéro de table
                  </label>
                  <div className="relative">
                    <Store className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-brand" />
                    <input
                      id="cart-table"
                      inputMode="numeric"
                      value={table}
                      onChange={(event) => setTable(event.target.value.replace(/\D/g, ""))}
                      placeholder="Ex. 12"
                      className="field pl-11 font-bold"
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-[1.35rem] border border-line/70 bg-surface p-4 shadow-card">
                <div className="mb-4 flex items-center gap-2">
                  <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-forest-soft text-forest">
                    <UserRound className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-display text-base font-semibold text-ink">Qui passe la commande ?</p>
                    <p className="text-[10px] text-muted">Chaque personne peut commander et payer séparément.</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div>
                    <label htmlFor="customer-name" className="label">
                      Prénom ou pseudo <span className="text-brand">*</span>
                    </label>
                    <input
                      id="customer-name"
                      autoComplete="given-name"
                      value={name}
                      onChange={(event) => setName(event.target.value.slice(0, 30))}
                      placeholder="Ex. Awa, Samy…"
                      className="field"
                      maxLength={30}
                    />
                    <p className="mt-1.5 text-[11px] leading-snug text-muted">
                      Il servira à retrouver votre commande à la caisse.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="customer-phone" className="label">
                      Téléphone <span className="font-normal text-muted">(facultatif)</span>
                    </label>
                    <div className="relative">
                      <Phone className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/60" />
                      <input
                        id="customer-phone"
                        type="tel"
                        autoComplete="tel"
                        value={phone}
                        onChange={(event) => setPhone(event.target.value.slice(0, 25))}
                        placeholder="+33 6 00 00 00 00"
                        className="field pl-11"
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="order-note" className="label">
                      Remarque générale <span className="font-normal text-muted">(facultatif)</span>
                    </label>
                    <textarea
                      id="order-note"
                      value={note}
                      onChange={(event) => setNote(event.target.value.slice(0, 500))}
                      rows={2}
                      placeholder="Allergies, demande particulière…"
                      className="field resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl border border-forest/10 bg-forest-soft/60 p-3.5 text-xs leading-relaxed text-forest dark:text-forest">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                <p>
                  <strong className="font-extrabold">Sans paiement en ligne.</strong> Votre commande est validée par la caisse. Vous réglerez sur place en donnant votre table ou votre pseudo.
                </p>
              </div>
            </div>
          ) : null}
        </div>

        {cart.lines.length ? (
          <div className="shrink-0 border-t border-line/70 bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-5">
            {error ? (
              <p role="alert" className="mb-2 flex items-start gap-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
            {!site.isOpen ? (
              <p className="mb-2 rounded-xl bg-red-50 p-2.5 text-xs font-bold text-red-800">
                {site.closedReason || "Les commandes sont fermées."}
              </p>
            ) : null}
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted">Total à régler</p>
                <p className="mt-0.5 flex items-center gap-1.5 text-[10px] font-medium text-muted">
                  <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                  Aucun frais ajouté
                </p>
              </div>
              <p className="font-display text-3xl font-semibold leading-none text-forest">{money(cart.subtotalCents)}</p>
            </div>
            <button
              type="button"
              onClick={submitOrder}
              disabled={loading || !site.isOpen}
              className="btn-primary min-h-14 w-full px-5 text-base"
            >
              {loading ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Envoi en cours…
                </>
              ) : (
                <>
                  Envoyer ma commande
                  <Send className="h-4 w-4" />
                </>
              )}
              {!loading ? <ChevronRight className="ml-auto h-4 w-4 opacity-60" /> : null}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
