"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Bike,
  Minus,
  Pencil,
  Plus,
  Send,
  ShoppingBag,
  Store,
  Trash2,
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label="Votre panier">
      <button
        type="button"
        onClick={() => !loading && onClose()}
        aria-label="Fermer le panier"
        className="absolute inset-0 bg-stone-950/45 backdrop-blur-[2px] animate-fade-in"
      />
      <div className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-cream shadow-soft animate-slide-up">
        <div className="flex shrink-0 items-center justify-between border-b border-black/5 bg-white px-4 py-3.5">
          <div>
            <h2 className="font-display text-xl font-bold text-forest">Votre panier</h2>
            <p className="text-xs font-semibold text-ink/45">
              {cart.count} article{cart.count > 1 ? "s" : ""} · {money(cart.subtotalCents)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-stone-100 text-ink/70"
            aria-label="Fermer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          {cart.lines.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-soft text-brand">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <p className="mt-4 font-display text-xl font-bold text-forest">Le panier est vide</p>
              <p className="mt-1 text-sm text-ink/50">Ajoutez un plat depuis le menu.</p>
              <button type="button" onClick={onClose} className="btn-secondary mt-4">
                Retour au menu
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              {cart.lines.map((line) => (
                <div key={line.key} className="flex gap-3 rounded-2xl border border-black/5 bg-white p-3">
                  {line.image ? (
                    <Image
                      src={line.image}
                      alt=""
                      width={76}
                      height={76}
                      className="h-[76px] w-[76px] shrink-0 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-[76px] w-[76px] shrink-0 items-center justify-center rounded-xl bg-sand">
                      <Image src="/logo.png" alt="" width={40} height={40} className="opacity-30" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-extrabold leading-tight text-ink">{line.name}</p>
                      <p className="shrink-0 text-sm font-extrabold">{money(line.unitPriceCents * line.quantity)}</p>
                    </div>
                    {line.options.length ? (
                      <p className="mt-0.5 text-[11px] leading-snug text-ink/45">
                        {line.options.map((option) => option.choiceName).join(" · ")}
                      </p>
                    ) : null}
                    {line.note ? (
                      <p className="mt-0.5 text-[11px] italic text-ink/40">« {line.note} »</p>
                    ) : null}
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded-full bg-stone-100">
                        <button
                          type="button"
                          onClick={() => cart.updateQuantity(line.key, line.quantity - 1)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink/65"
                          aria-label={`Diminuer ${line.name}`}
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="w-5 text-center text-xs font-extrabold">{line.quantity}</span>
                        <button
                          type="button"
                          onClick={() => cart.updateQuantity(line.key, line.quantity + 1)}
                          disabled={line.quantity >= 20}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-ink/65 disabled:opacity-30"
                          aria-label={`Augmenter ${line.name}`}
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => onEdit(line)}
                          className="flex h-8 items-center gap-1 rounded-full px-2 text-[11px] font-bold text-forest hover:bg-forest/5"
                        >
                          <Pencil className="h-3 w-3" />
                          Modifier
                        </button>
                        <button
                          type="button"
                          onClick={() => cart.removeItem(line.key)}
                          className="flex h-8 w-8 items-center justify-center rounded-full text-red-600 hover:bg-red-50"
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
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => cart.setMode("dine_in")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-extrabold ${
                    cart.mode === "dine_in"
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-black/10 bg-white text-ink/55"
                  }`}
                >
                  <Store className="h-4 w-4" />
                  Sur place
                </button>
                <button
                  type="button"
                  onClick={() => cart.setMode("takeaway")}
                  className={`flex items-center justify-center gap-2 rounded-2xl border-2 py-3 text-sm font-extrabold ${
                    cart.mode === "takeaway"
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-black/10 bg-white text-ink/55"
                  }`}
                >
                  <Bike className="h-4 w-4" />
                  À emporter
                </button>
              </div>

              {cart.mode === "dine_in" ? (
                <div>
                  <label htmlFor="cart-table" className="label">
                    Numéro de table
                  </label>
                  <input
                    id="cart-table"
                    inputMode="numeric"
                    value={table}
                    onChange={(event) => setTable(event.target.value.replace(/\D/g, ""))}
                    placeholder="Ex. 12"
                    className="field font-bold"
                  />
                </div>
              ) : null}

              <div className="rounded-2xl border border-black/5 bg-white p-4">
                <p className="mb-3 font-display text-base font-bold text-forest">
                  Qui passe la commande ?
                </p>
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
                    <p className="mt-1.5 text-[11px] leading-snug text-ink/40">
                      Il servira à retrouver votre commande à la caisse. À la même table, chacun
                      utilise son propre pseudo et paie sa commande.
                    </p>
                  </div>
                  <div>
                    <label htmlFor="customer-phone" className="label">
                      Téléphone <span className="font-normal text-ink/40">(facultatif)</span>
                    </label>
                    <input
                      id="customer-phone"
                      type="tel"
                      autoComplete="tel"
                      value={phone}
                      onChange={(event) => setPhone(event.target.value.slice(0, 25))}
                      placeholder="+33 6 00 00 00 00"
                      className="field"
                    />
                  </div>
                  <div>
                    <label htmlFor="order-note" className="label">
                      Remarque générale <span className="font-normal text-ink/40">(facultatif)</span>
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

              <div className="rounded-2xl bg-forest/5 p-3.5 text-xs leading-relaxed text-forest/80">
                <strong className="font-extrabold">Sans paiement en ligne.</strong> Votre commande
                sera validée par la caisse. Vous paierez à la caisse quand elle sera prête, en
                donnant votre numéro de table ou votre pseudo.
              </div>
            </div>
          ) : null}
        </div>

        {cart.lines.length ? (
          <div className="shrink-0 border-t border-black/5 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
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
            <div className="mb-3 flex items-center justify-between text-sm">
              <span className="font-bold text-ink/55">Total</span>
              <span className="font-display text-2xl font-bold text-forest">
                {money(cart.subtotalCents)}
              </span>
            </div>
            <button
              type="button"
              onClick={submitOrder}
              disabled={loading || !site.isOpen}
              className="btn-primary min-h-13 w-full text-base"
            >
              {loading ? "Envoi en cours…" : "Envoyer ma commande"}
              <Send className="h-5 w-5" />
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
