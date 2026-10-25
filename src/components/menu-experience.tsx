"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  Bike,
  CakeSlice,
  CupSoda,
  MapPin,
  RefreshCw,
  Search,
  ShoppingBag,
  Soup,
  Star,
  Store,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { MenuCategory, MenuData, MenuProduct } from "@/lib/menu-types";
import { ProductCard } from "./product-card";
import { ProductSheet } from "./product-sheet";
import { CartDrawer } from "./cart-drawer";
import { useCart, type CartLine } from "./cart-provider";
import { useMoney, useSite } from "./site-provider";
import { useToast } from "./toast-provider";
import { CardSkeleton } from "./ui/skeleton";
import { EmptyState } from "./ui/empty-state";

function dateRangeLabel(category: MenuCategory) {
  if (!category.availableFromDate && !category.availableToDate) return "";
  const format = (value: string) =>
    new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short" }).format(
      new Date(`${value}T12:00:00`),
    );
  const from = category.availableFromDate ? format(category.availableFromDate) : "…";
  const to = category.availableToDate ? format(category.availableToDate) : "…";
  return `${from} → ${to}`;
}

function categoryIcon(name: string) {
  const value = name.toLowerCase();
  if (value.includes("boisson")) return CupSoda;
  if (value.includes("dessert")) return CakeSlice;
  if (value.includes("assiette")) return UtensilsCrossed;
  if (value.includes("bowl") || value.includes("soupe")) return Soup;
  return UtensilsCrossed;
}

export function MenuExperience({
  initialMode,
  initialTable,
}: {
  initialMode: "dine_in" | "takeaway";
  initialTable: number | null;
}) {
  const site = useSite();
  const cart = useCart();
  const money = useMoney();
  const toast = useToast();
  const [data, setData] = useState<MenuData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<MenuProduct | null>(null);
  const [editingLine, setEditingLine] = useState<CartLine | undefined>(undefined);
  const [cartOpen, setCartOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const synced = useRef(false);

  useEffect(() => {
    if (synced.current) return;
    synced.current = true;
    if (initialTable) {
      cart.setMode("dine_in");
      cart.setTableNumber(initialTable);
    } else if (initialMode === "takeaway") {
      cart.setMode("takeaway");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialTable, initialMode]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await fetch("/api/menu", { cache: "no-store" });
        if (!response.ok) throw new Error("menu");
        const result = (await response.json()) as MenuData;
        if (!cancelled) {
          setData(result);
          setActiveCategory(result.categories[0]?.id || "");
        }
      } catch {
        if (!cancelled) setError("Le menu n'a pas pu être chargé. Vérifiez votre connexion.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const filteredCategories: MenuCategory[] = useMemo(() => {
    if (!data) return [];
    const term = query.trim().toLowerCase();
    const matches = (product: MenuProduct) =>
      !term ||
      product.name.toLowerCase().includes(term) ||
      product.description.toLowerCase().includes(term);
    const base = term
      ? data.categories
          .map((category) => ({
            ...category,
            products: category.products.filter(matches),
          }))
          .filter((category) => category.products.length > 0)
      : data.categories;
    const veganProducts = data.categories
      .flatMap((category) => category.products)
      .filter((product) => product.badges.vegan && matches(product));
    const veganCategory: MenuCategory | null = veganProducts.length
      ? {
          id: "vegan",
          name: "Végétalien",
          slug: "vegan",
          image: "/images/muceli.jpg",
          availableFrom: null,
          availableTo: null,
          availableFromDate: null,
          availableToDate: null,
          products: veganProducts,
        }
      : null;
    return veganCategory ? [...base, veganCategory] : base;
  }, [data, query]);

  useEffect(() => {
    if (!filteredCategories.length) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) {
          setActiveCategory(visible[0].target.id.replace("category-", ""));
        }
      },
      { rootMargin: "-150px 0px -55% 0px", threshold: 0 },
    );
    for (const category of filteredCategories) {
      const element = sectionRefs.current[category.id];
      if (element) observer.observe(element);
    }
    return () => observer.disconnect();
  }, [filteredCategories]);

  function scrollToCategory(category: MenuCategory) {
    const element = sectionRefs.current[category.id];
    if (!element) return;
    const top = element.getBoundingClientRect().top + window.scrollY - 142;
    window.scrollTo({ top, behavior: "smooth" });
    setActiveCategory(category.id);
  }

  function openProduct(product: MenuProduct) {
    setEditingLine(undefined);
    setSelectedProduct(product);
  }

  function editLine(line: CartLine) {
    const product = data?.categories
      .flatMap((category) => category.products)
      .find((item) => item.id === line.productId);
    if (!product) {
      toast.show({ message: "Ce plat n'est plus au menu.", type: "error" });
      return;
    }
    setCartOpen(false);
    setEditingLine(line);
    setSelectedProduct(product);
  }

  const productCount = filteredCategories.reduce(
    (sum, category) => sum + category.products.length,
    0,
  );

  const featuredProducts = useMemo(() => {
    if (!data) return [];
    const seen = new Set<string>();
    return data.categories
      .flatMap((category) => category.products)
      .filter((product) => {
        if (!product.featured || !product.available || seen.has(product.id)) return false;
        seen.add(product.id);
        return true;
      })
      .slice(0, 4);
  }, [data]);

  return (
    <div className="pb-32">
      <section className="relative isolate overflow-hidden bg-[#0d281f] text-white dark:bg-[#0a2119]">
        <Image
          src="/images/backglound.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-[56%_60%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,rgba(8,28,21,.93)_0%,rgba(8,28,21,.78)_42%,rgba(8,28,21,.28)_78%,rgba(8,28,21,.46)_100%)]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0b241b]/85 via-transparent to-[#0b241b]/15" />
        <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-brand/25 blur-3xl" />
        <div className="relative mx-auto w-full max-w-6xl px-4 pb-20 pt-6 sm:px-6 sm:pb-24 sm:pt-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-bold text-white/75 transition hover:bg-white/10 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
              Accueil
            </Link>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-[11px] font-bold text-white/80">
                {cart.mode === "dine_in" ? <Store className="h-3.5 w-3.5 text-[#f0b27a]" /> : <Bike className="h-3.5 w-3.5 text-[#f0b27a]" />}
                {cart.mode === "dine_in"
                  ? cart.tableNumber
                    ? `Table ${cart.tableNumber}`
                    : "Sur place"
                  : "À emporter"}
              </span>
              <Link href="/" className="text-[11px] font-bold text-[#f0b27a] underline-offset-4 hover:underline">
                Modifier
              </Link>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_auto] lg:items-end">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[0.24em] text-[#f0b27a]">
                <span className="h-px w-7 bg-[#f0b27a]/50" />
                Notre carte
              </p>
              <h1 className="mt-3 max-w-2xl font-display text-4xl font-semibold leading-[1.02] sm:text-6xl">
                Choisissez votre prochain coup de cœur.
              </h1>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/60 sm:text-base">
                Des bols généreux, des assiettes du voyage et des douceurs maison. Personnalisez chaque plat selon vos envies.
              </p>
            </div>
            <div className="flex flex-col items-start gap-3 lg:items-end">
              <div className="hidden w-48 overflow-hidden rounded-[1.5rem] border border-white/15 bg-white/10 p-1.5 shadow-soft backdrop-blur lg:block">
                <div className="relative aspect-[4/3] overflow-hidden rounded-[1.1rem]">
                  <Image src="/images/ugali.jpg" alt="Grillades et accompagnements maison" fill sizes="192px" className="object-cover" />
                </div>
                <p className="px-1.5 pb-0.5 pt-2 text-[9px] font-extrabold uppercase tracking-[0.16em] text-[#f0b27a]">Cuisine maison</p>
              </div>
              <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 backdrop-blur">
                <span className={`status-dot ${site.isOpen ? "text-emerald-400" : "text-red-400"}`} />
                <div>
                  <p className="text-xs font-extrabold">
                    {data?.service.label || (site.isOpen ? "La cuisine est ouverte" : "Commandes fermées")}
                  </p>
                  <p className="text-[10px] text-white/45">
                    {data?.service.note || (site.isOpen ? "Préparation minute" : site.hoursText)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="relative z-10 mx-auto -mt-8 w-full max-w-6xl px-4 sm:px-6">
        <div className="rounded-[1.5rem] border border-line/70 bg-surface p-2 shadow-soft">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Rechercher un plat, une envie…"
              className="h-14 w-full rounded-[1.1rem] border-0 bg-sand/45 pl-12 pr-12 text-sm font-medium text-ink outline-none transition placeholder:text-muted/70 focus:bg-sand/70 focus:ring-4 focus:ring-brand/10"
              aria-label="Rechercher dans le menu"
            />
            {query ? (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-muted shadow-sm hover:text-ink"
                aria-label="Effacer la recherche"
              >
                <X className="h-4 w-4" />
              </button>
            ) : (
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold uppercase tracking-[0.12em] text-muted/50">
                {data ? `${data.categories.reduce((sum, category) => sum + category.products.length, 0)} plats` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      {!site.isOpen ? (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {site.closedReason || "Les commandes sont momentanément fermées."}
          </div>
        </div>
      ) : data?.service.mode === "breakfast" ? (
        <div className="mx-auto mt-4 w-full max-w-6xl px-4 sm:px-6">
          <div className="flex flex-col gap-1 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-900 sm:flex-row sm:items-center sm:justify-between">
            <span>Petit-déjeuner servi jusqu&apos;à 11h.</span>
            <span className="text-xs font-bold text-amber-800">La carte complète prend le relais à 11h.</span>
          </div>
        </div>
      ) : null}

      {featuredProducts.length && !query ? (
        <section className="mx-auto mt-5 w-full max-w-6xl px-4 sm:px-6" aria-labelledby="featured-title">
          <div className="relative overflow-hidden rounded-[1.8rem] border border-brand/20 bg-[#12352a] p-3 text-white shadow-lift dark:bg-[#0d281f] sm:p-4">
            <div className="pointer-events-none absolute -right-16 -top-16 h-52 w-52 rounded-full bg-brand/20 blur-3xl" />
            <div className="relative flex flex-wrap items-end justify-between gap-2 px-2 pb-3 pt-1">
              <div>
                <p className="flex items-center gap-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-[#f0b27a]">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  Le coup de cœur
                </p>
                <h2 id="featured-title" className="mt-1 font-display text-2xl font-semibold sm:text-3xl">
                  À ne pas manquer
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-bold text-white/55">
                Sélection du moment
              </span>
            </div>

            <div className="no-scrollbar relative flex snap-x gap-3 overflow-x-auto pb-1 md:grid md:grid-cols-2 xl:grid-cols-2">
              {featuredProducts.map((product) => (
                <button
                  key={product.id}
                  type="button"
                  onClick={() => openProduct(product)}
                  className="group relative min-h-[17rem] w-[84vw] max-w-[420px] shrink-0 snap-start overflow-hidden rounded-[1.4rem] border border-white/10 text-left shadow-card transition hover:-translate-y-0.5 hover:border-white/25 md:w-auto md:max-w-none sm:min-h-[19rem]"
                >
                  {product.image ? (
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 768px) 84vw, 50vw"
                      className="object-cover transition duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-sand to-brand-soft/50">
                      <Image src="/logo.png" alt="" width={80} height={80} className="opacity-30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#120c08]/95 via-[#120c08]/25 to-transparent" />
                  <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-brand px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-[0.1em] text-white shadow-glow">
                    <Star className="h-3 w-3 fill-current" />
                    Plat spécial
                  </span>
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="font-display text-2xl font-semibold leading-tight text-white">{product.name}</h3>
                    <p className="mt-1 line-clamp-2 max-w-md text-[11px] leading-relaxed text-white/65">
                      {product.description}
                    </p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="font-display text-xl font-semibold text-white">{money(product.priceCents)}</span>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[10px] font-extrabold text-[#12352a] transition group-hover:bg-[#f0b27a]">
                        Voir le plat
                        <ArrowRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <nav
        className="no-scrollbar sticky top-16 z-30 mt-4 overflow-x-auto border-y border-line/70 glass sm:top-[4.5rem]"
        aria-label="Catégories du menu"
      >
        <div className="mx-auto flex w-max min-w-full max-w-6xl gap-2 px-4 py-2.5 sm:px-6">
          {filteredCategories.map((category) => {
            const Icon = categoryIcon(category.name);
            const active = activeCategory === category.id;
            return (
              <button
                key={category.id}
                type="button"
                onClick={() => scrollToCategory(category)}
                className={`flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-3.5 py-2 text-xs font-extrabold transition sm:text-sm ${
                  active
                    ? "bg-forest text-white shadow-card"
                    : "border border-line/70 bg-surface/70 text-muted hover:border-brand/25 hover:text-ink"
                }`}
              >
                <Icon className={`h-4 w-4 ${active ? "text-[#f0b27a]" : "text-brand"}`} />
                {category.name}
                <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${active ? "bg-white/15 text-white/70" : "bg-sand text-muted"}`}>
                  {category.products.length}
                </span>
              </button>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
        {loading ? (
          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
        ) : error ? (
          <EmptyState
            icon={RefreshCw}
            title="Le menu ne répond pas"
            description={error}
            className="mt-6"
            action={
              <button type="button" onClick={() => window.location.reload()} className="btn-secondary">
                <RefreshCw className="h-4 w-4" />
                Réessayer
              </button>
            }
          />
        ) : !productCount ? (
          <EmptyState
            icon={Search}
            title={`Aucun plat pour « ${query} »`}
            description="Essayez un autre mot-clé ou parcourez toutes nos catégories."
            className="mt-6"
            action={
              <button type="button" onClick={() => setQuery("")} className="btn-secondary">
                Voir tout le menu
              </button>
            }
          />
        ) : (
          <div>
            {filteredCategories.map((category) => {
              const Icon = categoryIcon(category.name);
              return (
                <section
                  key={category.id}
                  id={`category-${category.id}`}
                  ref={(element) => {
                    sectionRefs.current[category.id] = element;
                  }}
                  className="scroll-mt-36 pt-9"
                  aria-labelledby={`title-${category.id}`}
                >
                  <div className="mb-4 flex items-center gap-3">
                    {category.image ? (
                      <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-2xl border border-line/60 bg-sand shadow-card sm:h-16 sm:w-24">
                        <Image src={category.image} alt="" fill sizes="96px" className="object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/35 to-transparent" />
                      </div>
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-brand-soft text-brand-dark">
                        <Icon className="h-5 w-5" />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 id={`title-${category.id}`} className="section-title leading-none">
                          {category.name}
                        </h2>
                        {category.availableFrom && category.availableTo ? (
                          <span className="rounded-full bg-sand px-2 py-0.5 text-[9px] font-extrabold text-muted">
                            {category.availableFrom.replace(":", "h")} – {category.availableTo.replace(":", "h")}
                          </span>
                        ) : null}
                        {dateRangeLabel(category) ? (
                          <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[9px] font-extrabold text-brand-dark">
                            Menu spécial · {dateRangeLabel(category)}
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[11px] font-semibold text-muted">
                        {category.products.length} plat{category.products.length > 1 ? "s" : ""} à découvrir
                      </p>
                    </div>
                    <span className="hidden h-px flex-1 bg-line sm:block" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4 lg:gap-4">
                    {category.products.map((product) => (
                      <ProductCard key={product.id} product={product} onOpen={openProduct} />
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>

      {cart.count > 0 ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))] sm:px-4">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="group mx-auto flex w-full max-w-xl items-center gap-3 rounded-[1.4rem] border border-white/10 bg-[#12352a] p-2.5 pr-3 text-white shadow-lift transition hover:bg-[#174435] active:scale-[.992] dark:bg-[#0d281f]"
          >
            <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/10">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold shadow-glow">
                {cart.count}
              </span>
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/45">
                Votre panier
              </span>
              <span className="mt-0.5 flex items-baseline gap-2">
                <span className="font-display text-lg font-semibold leading-none">{money(cart.subtotalCents)}</span>
                <span className="text-[11px] font-semibold text-white/50">{cart.count} article{cart.count > 1 ? "s" : ""}</span>
              </span>
            </span>
            <span className="flex h-10 items-center gap-1.5 rounded-2xl bg-[#f0b27a] px-3.5 text-xs font-extrabold text-[#2a1a12] transition group-hover:bg-[#f7c795]">
              Voir
              <ArrowRight className="h-4 w-4" />
            </span>
          </button>
        </div>
      ) : (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-full border border-line/70 bg-surface/85 px-4 py-2.5 text-[11px] font-bold text-muted shadow-card backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            {cart.mode === "dine_in"
              ? cart.tableNumber
                ? `Commande pour la table ${cart.tableNumber}`
                : "Table à préciser au moment de commander"
              : "Commande à emporter · retrait au comptoir"}
          </div>
        </div>
      )}

      {selectedProduct ? (
        <ProductSheet
          key={`${selectedProduct.id}-${editingLine?.key || "new"}`}
          product={selectedProduct}
          initialLine={editingLine}
          onClose={() => {
            setSelectedProduct(null);
            setEditingLine(undefined);
          }}
        />
      ) : null}

      <CartDrawer open={cartOpen} onClose={() => setCartOpen(false)} onEdit={editLine} />
    </div>
  );
}
