"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import {
  AlertCircle,
  Check,
  Clock3,
  Minus,
  Plus,
  ShoppingBag,
  ChefHat,
  X,
} from "lucide-react";
import type { MenuProduct } from "@/lib/menu-types";
import { useCart, type CartLine } from "./cart-provider";
import { useMoney, useSite } from "./site-provider";
import { useToast } from "./toast-provider";
import { ProductBadges } from "./badges";

export function ProductSheet({
  product,
  initialLine,
  onClose,
}: {
  product: MenuProduct;
  initialLine?: CartLine;
  onClose: () => void;
}) {
  const cart = useCart();
  const money = useMoney();
  const site = useSite();
  const toast = useToast();
  const [selected, setSelected] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    if (initialLine) {
      for (const group of product.optionGroups) {
        initial[group.id] = initialLine.options
          .filter((option) => option.groupId === group.id)
          .map((option) => option.choiceId);
      }
    } else {
      for (const group of product.optionGroups) {
        if (group.type === "single" && group.required && group.choices[0]) {
          initial[group.id] = [group.choices[0].id];
        }
      }
    }
    return initial;
  });
  const [quantity, setQuantity] = useState(initialLine?.quantity || 1);
  const [note, setNote] = useState(initialLine?.note || "");
  const [error, setError] = useState("");

  useEffect(() => {
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = original;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const total = useMemo(() => {
    let delta = 0;
    for (const group of product.optionGroups) {
      const ids = selected[group.id] || [];
      for (const choice of group.choices) {
        if (ids.includes(choice.id)) delta += choice.priceDeltaCents;
      }
    }
    return Math.max(0, product.priceCents + delta) * quantity;
  }, [product, selected, quantity]);

  function toggleChoice(groupId: string, choiceId: string, type: string) {
    setError("");
    setSelected((current) => {
      const currentIds = current[groupId] || [];
      const group = product.optionGroups.find((item) => item.id === groupId);
      if (!group) return current;
      if (type === "single") {
        return { ...current, [groupId]: currentIds.includes(choiceId) ? [] : [choiceId] };
      }
      if (currentIds.includes(choiceId)) {
        return { ...current, [groupId]: currentIds.filter((id) => id !== choiceId) };
      }
      if (currentIds.length >= group.maxSelections) return current;
      return { ...current, [groupId]: [...currentIds, choiceId] };
    });
  }

  function submit() {
    if (!product.available) {
      setError("Ce plat n'est plus disponible.");
      return;
    }
    for (const group of product.optionGroups) {
      const count = (selected[group.id] || []).length;
      if (group.required && count === 0) {
        setError(`Choisissez une option pour « ${group.name} ».`);
        return;
      }
      if (count < group.minSelections) {
        setError(`Choisissez au moins ${group.minSelections} option(s) pour « ${group.name} ».`);
        return;
      }
      if (count > group.maxSelections) {
        setError(`Choisissez au maximum ${group.maxSelections} option(s) pour « ${group.name} ».`);
        return;
      }
    }

    const options = product.optionGroups.flatMap((group) =>
      group.choices
        .filter((choice) => (selected[group.id] || []).includes(choice.id))
        .map((choice) => ({
          groupId: group.id,
          groupName: group.name,
          choiceId: choice.id,
          choiceName: choice.name,
          priceDeltaCents: choice.priceDeltaCents,
        })),
    );
    const delta = options.reduce((sum, option) => sum + option.priceDeltaCents, 0);

    if (initialLine) cart.removeItem(initialLine.key);
    cart.addItem({
      productId: product.id,
      name: product.name,
      image: product.image,
      basePriceCents: product.priceCents,
      unitPriceCents: Math.max(0, product.priceCents + delta),
      quantity,
      note,
      options,
    });
    if (initialLine) toast.show({ message: "Article mis à jour.", type: "success" });
    else toast.show({ message: `${product.name} ajouté au panier.`, type: "success" });
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 animate-fade-in bg-stone-950/60 backdrop-blur-[3px]"
      />
      <div className="relative flex max-h-[95dvh] w-full max-w-2xl animate-slide-up flex-col overflow-hidden rounded-t-[2rem] bg-surface shadow-soft sm:rounded-[2rem]">
        <div className="relative shrink-0">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={960}
              height={720}
              className="h-56 w-full object-cover sm:h-72"
            />
          ) : (
            <div className="flex h-48 items-center justify-center bg-sand">
              <Image src="/logo.png" alt="" width={100} height={100} className="opacity-30" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a120d]/70 via-transparent to-transparent" />
          <span className="absolute left-1/2 top-2.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-white/60 sm:hidden" />
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
            <div className="flex flex-wrap gap-1">
              {product.featured ? (
                <span className="badge border-0 bg-brand/95 text-white backdrop-blur">Plat spécial</span>
              ) : null}
              <ProductBadges badges={product.badges} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-black/25 text-white backdrop-blur transition hover:bg-black/40"
              aria-label="Fermer la fiche"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="absolute inset-x-4 bottom-4 text-white sm:inset-x-6">
            <div className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/65">
              <ChefHat />
              Préparé minute
            </div>
            <h2 className="mt-1.5 max-w-md font-display text-3xl font-semibold leading-none drop-shadow-sm sm:text-4xl">
              {product.name}
            </h2>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 pt-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <p className="max-w-lg text-sm leading-relaxed text-muted">{product.description}</p>
            <p className="shrink-0 rounded-2xl bg-brand-soft px-3 py-2 font-display text-lg font-semibold text-brand-dark">
              {money(product.priceCents)}
            </p>
          </div>

          {product.optionGroups.map((group, groupIndex) => {
            const chosen = selected[group.id] || [];
            return (
              <fieldset key={group.id} className="mt-6 border-t border-line/70 pt-5">
                <legend className="flex w-full items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-sand text-[10px] font-extrabold text-muted">
                      {groupIndex + 1}
                    </span>
                    <span className="font-display text-lg font-semibold text-ink">{group.name}</span>
                  </span>
                  <span
                    className={`rounded-full px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] ${
                      group.required ? "bg-brand-soft text-brand-dark" : "bg-sand text-muted"
                    }`}
                  >
                    {group.required ? "Obligatoire" : "Facultatif"} ·{" "}
                    {group.type === "single" ? "1 choix" : `${group.maxSelections} max`}
                  </span>
                </legend>
                <div className="mt-3 space-y-2">
                  {group.choices.map((choice) => {
                    const checked = chosen.includes(choice.id);
                    const disabled =
                      !choice.available ||
                      (group.type === "multiple" &&
                        !checked &&
                        chosen.length >= group.maxSelections);
                    const single = group.type === "single";
                    return (
                      <label
                        key={choice.id}
                        className={`flex min-h-[3.4rem] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-3 text-sm transition ${
                          checked
                            ? "border-brand/45 bg-brand-soft/55"
                            : "border-line/70 bg-surface hover:border-brand/25 hover:bg-brand-soft/20"
                        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <input
                          type={single ? "radio" : "checkbox"}
                          name={group.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleChoice(group.id, choice.id, group.type)}
                          className="sr-only"
                        />
                        <span
                          aria-hidden="true"
                          className={`flex h-5 w-5 shrink-0 items-center justify-center border-2 transition ${
                            single ? "rounded-full" : "rounded-md"
                          } ${checked ? "border-brand bg-brand text-white" : "border-line bg-surface"}`}
                        >
                          {checked ? <Check className="h-3 w-3" strokeWidth={3} /> : null}
                        </span>
                        <span className="flex-1 font-semibold text-ink/85">
                          {choice.name}
                          {!choice.available ? " (indisponible)" : ""}
                        </span>
                        <span className={`shrink-0 text-xs font-extrabold ${choice.priceDeltaCents > 0 ? "text-brand-dark" : "text-muted"}`}>
                          {choice.priceDeltaCents === 0
                            ? "Inclus"
                            : `${choice.priceDeltaCents > 0 ? "+" : ""}${money(choice.priceDeltaCents)}`}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            );
          })}

          <div className="mt-6 border-t border-line/70 pt-5">
            <label htmlFor="item-note" className="label">
              Une demande pour la cuisine ? <span className="font-normal text-muted">(facultatif)</span>
            </label>
            <textarea
              id="item-note"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 300))}
              rows={2}
              placeholder="Sans oignon, sauce à part, allergie…"
              className="field resize-none"
            />
          </div>

          {error ? (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-2xl bg-red-50 px-3.5 py-3 text-sm font-bold text-red-800">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-line/70 bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center rounded-2xl border border-line bg-sand/45 p-1">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-surface disabled:opacity-30"
                aria-label="Diminuer la quantité"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-6 text-center text-sm font-extrabold tabular-nums" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                disabled={quantity >= 20}
                className="flex h-10 w-10 items-center justify-center rounded-xl text-ink transition hover:bg-surface disabled:opacity-30"
                aria-label="Augmenter la quantité"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!product.available || !site.isOpen}
              className="btn-primary min-h-[3.35rem] flex-1 px-4 text-sm sm:text-base"
            >
              <ShoppingBag className="h-5 w-5 shrink-0" />
              <span className="truncate">
                {product.available ? (site.isOpen ? "Ajouter au panier" : "Commandes fermées") : "Épuisé"}
              </span>
              <span className="ml-auto shrink-0 rounded-full bg-white/15 px-2.5 py-1 font-extrabold tabular-nums">
                {money(total)}
              </span>
            </button>
          </div>
          <p className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-medium text-muted">
            <Clock3 className="h-3 w-3" />
            Préparation minute · paiement à la caisse
          </p>
        </div>
      </div>
    </div>
  );
}
