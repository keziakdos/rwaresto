"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { Minus, Plus, X, ShoppingBag, AlertCircle } from "lucide-react";
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
    <div className="fixed inset-0 z-50 flex items-end justify-center" role="dialog" aria-modal="true" aria-label={product.name}>
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/45 backdrop-blur-[2px] animate-fade-in"
      />
      <div className="relative flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[2rem] bg-white shadow-soft animate-slide-up sm:mb-4 sm:rounded-[2rem]">
        <div className="relative shrink-0">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              width={960}
              height={720}
              className="h-52 w-full object-cover sm:h-64"
            />
          ) : (
            <div className="flex h-44 items-center justify-center bg-sand">
              <Image src="/logo.png" alt="" width={100} height={100} className="opacity-30" />
            </div>
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3">
            <div className="flex flex-wrap gap-1">
              <ProductBadges badges={product.badges} />
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/90 text-ink shadow-card backdrop-blur"
              aria-label="Fermer la fiche"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl font-bold leading-tight text-forest">
                {product.name}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-ink/55">{product.description}</p>
            </div>
            <p className="shrink-0 text-lg font-extrabold text-ink">{money(product.priceCents)}</p>
          </div>

          {product.optionGroups.map((group) => {
            const chosen = selected[group.id] || [];
            return (
              <fieldset key={group.id} className="mt-5 border-t border-black/5 pt-4">
                <legend className="flex w-full items-center justify-between gap-2">
                  <span className="font-display text-base font-bold text-ink">{group.name}</span>
                  <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-stone-500">
                    {group.required ? "Obligatoire" : "Facultatif"} ·{" "}
                    {group.type === "single" ? "1 choix" : `${group.maxSelections} max`}
                  </span>
                </legend>
                <div className="mt-2 space-y-1.5">
                  {group.choices.map((choice) => {
                    const checked = chosen.includes(choice.id);
                    const disabled =
                      !choice.available ||
                      (group.type === "multiple" &&
                        !checked &&
                        chosen.length >= group.maxSelections);
                    return (
                      <label
                        key={choice.id}
                        className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-2xl border px-3.5 py-2.5 text-sm transition ${
                          checked
                            ? "border-brand bg-brand-soft/60"
                            : "border-black/5 bg-stone-50/60 hover:border-brand/25"
                        } ${disabled ? "cursor-not-allowed opacity-40" : ""}`}
                      >
                        <input
                          type={group.type === "single" ? "radio" : "checkbox"}
                          name={group.id}
                          checked={checked}
                          disabled={disabled}
                          onChange={() => toggleChoice(group.id, choice.id, group.type)}
                          className="h-4 w-4 accent-[var(--color-brand)]"
                        />
                        <span className="flex-1 font-semibold text-ink/80">
                          {choice.name}
                          {!choice.available ? " (indisponible)" : ""}
                        </span>
                        <span className="text-xs font-extrabold text-ink/55">
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

          <div className="mt-5 border-t border-black/5 pt-4">
            <label htmlFor="item-note" className="label">
              Remarque pour la cuisine <span className="font-normal text-ink/40">(facultatif)</span>
            </label>
            <textarea
              id="item-note"
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 300))}
              rows={2}
              placeholder="Sans oignon, sauce à part…"
              className="field resize-none"
            />
          </div>

          {error ? (
            <p role="alert" className="mt-3 flex items-center gap-2 text-sm font-bold text-red-700">
              <AlertCircle className="h-4 w-4" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="shrink-0 border-t border-black/5 bg-white px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex items-center rounded-full border border-black/10 bg-white">
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.max(1, value - 1))}
                disabled={quantity <= 1}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70 disabled:opacity-30"
                aria-label="Diminuer la quantité"
              >
                <Minus className="h-4 w-4" />
              </button>
              <span className="w-7 text-center text-sm font-extrabold" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((value) => Math.min(20, value + 1))}
                disabled={quantity >= 20}
                className="flex h-11 w-11 items-center justify-center rounded-full text-ink/70 disabled:opacity-30"
                aria-label="Augmenter la quantité"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!product.available || !site.isOpen}
              className="btn-primary min-h-12 flex-1 px-4 text-base"
            >
              <ShoppingBag className="h-5 w-5" />
              {product.available ? (site.isOpen ? "Ajouter" : "Commandes fermées") : "Épuisé"}
              <span className="ml-auto font-extrabold">{money(total)}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
