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
    <article className="relative h-full">
      <button
        type="button"
        onClick={() => !disabled && onOpen(product)}
        disabled={disabled}
        className={`group flex h-full w-full flex-col overflow-hidden rounded-[1.45rem] border border-line/70 bg-surface text-left shadow-card transition duration-300 ${
          disabled ? "cursor-not-allowed opacity-60" : "hover:-translate-y-1 hover:border-brand/20 hover:shadow-soft"
        }`}
      >
        <div className="relative aspect-[5/4] w-full overflow-hidden bg-sand">
          {product.image ? (
            <Image
              src={product.image}
              alt={product.name}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 290px"
              className={`object-cover transition duration-700 ${
                disabled ? "grayscale" : "group-hover:scale-[1.05]"
              }`}
            />
          ) : (
            <Image src="/logo.png" alt="" width={90} height={90} className="m-auto opacity-30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a120d]/45 via-transparent to-transparent opacity-70" />
          <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
            {product.featured && !disabled ? (
              <span className="rounded-full bg-brand px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-glow">
                Spécial
              </span>
            ) : null}
            {product.badges.isNew && !disabled ? (
              <span className="rounded-full border border-white/30 bg-white/90 px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-brand-dark backdrop-blur">
                Nouveau
              </span>
            ) : null}
            <ProductBadges badges={{ ...product.badges, isNew: false }} limit={2} />
          </div>
          {disabled ? (
            <div className="absolute inset-0 flex items-center justify-center bg-stone-950/40 backdrop-blur-[1px]">
              <span className="rounded-full bg-surface px-3.5 py-1.5 text-[11px] font-extrabold text-ink shadow-card">
                Épuisé aujourd&apos;hui
              </span>
            </div>
          ) : null}
          <span
            aria-hidden="true"
            className={`absolute bottom-2.5 right-2.5 flex h-10 w-10 items-center justify-center rounded-full border-2 border-surface shadow-card transition duration-200 ${
              disabled
                ? "bg-sand text-muted"
                : "bg-brand text-white group-hover:scale-110 group-hover:bg-brand-dark group-active:scale-95"
            }`}
          >
            <Plus className="h-5 w-5" strokeWidth={2.8} />
          </span>
        </div>
        <div className="flex flex-1 flex-col p-3.5 sm:p-4">
          <h3 className="font-display text-[16px] font-semibold leading-tight text-ink sm:text-[1.08rem]">
            {product.name}
          </h3>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted sm:text-[12px]">
            {product.description}
          </p>
          <div className="mt-auto flex items-end justify-between gap-2 pt-3">
            <span className="text-[15px] font-extrabold tracking-tight text-forest sm:text-base">
              {money(product.priceCents)}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-muted/70">
              {disabled ? "Indisponible" : "Ajouter"}
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}
