"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import type { MenuProduct } from "@/lib/menu-types";
import { ProductBadges } from "./badges";
import { useMoney } from "./site-provider";

export function ProductCard({
  product,
  onOpen,
}: {
  product: MenuProduct;
  onOpen: (product: MenuProduct) => void;
}) {
  const money = useMoney();
  const disabled = !product.available;

  return (
    <article className="relative">
      <button
        type="button"
        onClick={() => !disabled && onOpen(product)}
        disabled={disabled}
        className={`group flex h-full w-full flex-col overflow-hidden rounded-3xl border border-black/5 bg-white text-left shadow-card transition ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-0.5 hover:shadow-soft"
        }`}
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden bg-sand">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, 300px"
              className={`object-cover transition duration-500 ${
                disabled ? "grayscale" : "group-hover:scale-[1.03]"
              }`}
            />
          ) : (
            <Image src="/logo.png" alt="" width={90} height={90} className="m-auto opacity-30" />
          )}
          {disabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-900/35">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-extrabold text-stone-700">
                Épuisé
              </span>
            </div>
          ) : null}
          {!disabled && product.badges.isNew ? (
            <span className="absolute left-2 top-2 rounded-full bg-brand px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-white shadow">
              Nouveau
            </span>
          ) : null}
        </div>
        <div className="flex flex-1 flex-col p-3 sm:p-4">
          <h3 className="font-display text-[15px] font-bold leading-tight text-forest sm:text-lg">
            {product.name}
          </h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-ink/50 sm:text-xs">
            {product.description}
          </p>
          <div className="mt-2">
            <ProductBadges badges={product.badges} limit={2} />
          </div>
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <span className="text-sm font-extrabold text-ink sm:text-base">
              {money(product.priceCents)}
            </span>
            <span
              aria-hidden="true"
              className={`flex h-8 w-8 items-center justify-center rounded-full ${
                disabled ? "bg-stone-100 text-stone-400" : "bg-brand text-white shadow-card"
              }`}
            >
              <Plus className="h-4 w-4" strokeWidth={3} />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
