"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Bike,
  MapPin,
  RefreshCw,
  Search,
  ShoppingBag,
  Store,
  X,
} from "lucide-react";
import type { MenuCategory, MenuData, MenuProduct } from "@/lib/menu-types";
import { ProductCard } from "./product-card";
import { ProductSheet } from "./product-sheet";
import { CartDrawer } from "./cart-drawer";
import { useCart, type CartLine } from "./cart-provider";
import { useMoney, useSite } from "./site-provider";
import { useToast } from "./toast-provider";

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
    if (!term) return data.categories;
    return data.categories
      .map((category) => ({
        ...category,
        products: category.products.filter(
          (product) =>
            product.name.toLowerCase().includes(term) ||
            product.description.toLowerCase().includes(term),
        ),
      }))
      .filter((category) => category.products.length > 0);
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
      { rootMargin: "-130px 0px -60% 0px", threshold: 0 },
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
    const top = element.getBoundingClientRect().top + window.scrollY - 122;
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

  return (
    <div className="pb-28">
      <div className="mx-auto w-full max-w-5xl px-4 pt-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link href="/" className="btn-ghost min-h-10 px-2 text-sm">
            <ArrowLeft className="h-4 w-4" />
            Accueil
          </Link>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-forest shadow-card">
              {cart.mode === "dine_in" ? <Store className="h-3.5 w-3.5" /> : <Bike className="h-3.5 w-3.5" />}
              {cart.mode === "dine_in"
                ? cart.tableNumber
                  ? `Table ${cart.tableNumber}`
                  : "Sur place"
                : "À emporter"}
            </span>
            <Link href="/" className="text-xs font-bold text-brand underline-offset-4 hover:underline">
              Modifier
            </Link>
          </div>
        </div>

        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Notre carte</p>
            <h1 className="font-display text-3xl font-bold leading-tight text-forest sm:text-4xl">
              Qu'est-ce qu'on mange ?
            </h1>
          </div>
          <p className="text-sm font-semibold text-ink/45">
            {site.isOpen ? "Cuisine ouverte" : "Commandes fermées"}
          </p>
        </div>

        {!site.isOpen ? (
          <div className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">
            {site.closedReason || "Les commandes sont momentanément fermées."}
          </div>
        ) : null}

        <div className="relative mt-4">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink/35" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Rechercher un plat…"
            className="field h-13 rounded-full pl-12 pr-11"
            aria-label="Rechercher dans le menu"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-stone-100 text-ink/50"
              aria-label="Effacer la recherche"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>

      <nav
        className="no-scrollbar sticky top-[64px] z-30 mt-4 overflow-x-auto border-y border-black/5 glass"
        aria-label="Catégories du menu"
      >
        <div className="mx-auto flex w-max min-w-full max-w-5xl gap-1.5 px-4 py-2.5">
          {filteredCategories.map((category) => (
            <button
              key={category.id}
              type="button"
              onClick={() => scrollToCategory(category)}
              className={`whitespace-nowrap rounded-full px-3.5 py-2 text-sm font-extrabold transition ${
                activeCategory === category.id
                  ? "bg-brand text-white shadow-card"
                  : "text-ink/55 hover:bg-black/5"
              }`}
            >
              {category.name}
              <span className="ml-1.5 text-[10px] opacity-60">{category.products.length}</span>
            </button>
          ))}
          {!filteredCategories.length && !loading ? (
            <span className="py-2 text-sm font-semibold text-ink/40">Aucune catégorie</span>
          ) : null}
        </div>
      </nav>

      <div className="mx-auto w-full max-w-5xl px-4">
        {loading ? (
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-3xl bg-white p-3 shadow-card">
                <div className="aspect-[4/3] rounded-2xl bg-stone-100" />
                <div className="mt-3 h-4 w-3/4 rounded bg-stone-100" />
                <div className="mt-2 h-3 w-1/2 rounded bg-stone-100" />
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="card mt-6 flex flex-col items-center p-8 text-center">
            <p className="font-display text-lg font-bold text-forest">Oups, le menu ne répond pas.</p>
            <p className="mt-1 text-sm text-ink/50">{error}</p>
            <button type="button" onClick={() => window.location.reload()} className="btn-secondary mt-4">
              <RefreshCw className="h-4 w-4" />
              Réessayer
            </button>
          </div>
        ) : !productCount ? (
          <div className="card mt-6 flex flex-col items-center p-8 text-center">
            <Search className="h-8 w-8 text-ink/25" />
            <p className="mt-3 font-display text-lg font-bold text-forest">
              Aucun plat ne correspond à « {query} »
            </p>
            <button type="button" onClick={() => setQuery("")} className="btn-secondary mt-4">
              Voir tout le menu
            </button>
          </div>
        ) : (
          <div className="mt-1">
            {filteredCategories.map((category) => (
              <section
                key={category.id}
                id={`category-${category.id}`}
                ref={(element) => {
                  sectionRefs.current[category.id] = element;
                }}
                className="scroll-mt-32 pt-7"
                aria-labelledby={`title-${category.id}`}
              >
                <div className="mb-3 flex items-baseline gap-2">
                  <h2 id={`title-${category.id}`} className="section-title">
                    {category.name}
                  </h2>
                  <span className="text-xs font-bold text-ink/35">
                    {category.products.length} plat{category.products.length > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
                  {category.products.map((product) => (
                    <ProductCard key={product.id} product={product} onOpen={openProduct} />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {cart.count > 0 ? (
        <div className="no-print fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            className="mx-auto flex w-full max-w-xl items-center gap-3 rounded-full bg-forest px-4 py-3 text-white shadow-soft transition hover:bg-forest-light active:scale-[.99]"
          >
            <span className="relative flex h-10 w-10 items-center justify-center rounded-full bg-white/12">
              <ShoppingBag className="h-5 w-5" />
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-extrabold">
                {cart.count}
              </span>
            </span>
            <span className="flex-1 text-left">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-white/55">
                Voir le panier
              </span>
              <span className="block text-sm font-extrabold">
                {cart.count} article{cart.count > 1 ? "s" : ""} · {money(cart.subtotalCents)}
              </span>
            </span>
            <span className="rounded-full bg-white px-3 py-1.5 text-xs font-extrabold text-forest">
              Voir
            </span>
          </button>
        </div>
      ) : (
        <div className="no-print fixed inset-x-0 bottom-0 z-30 px-3 pb-[max(.75rem,env(safe-area-inset-bottom))]">
          <div className="mx-auto flex w-full max-w-xl items-center justify-center gap-2 rounded-full bg-white/90 px-4 py-2.5 text-xs font-bold text-ink/45 shadow-card backdrop-blur">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            {cart.mode === "dine_in"
              ? cart.tableNumber
                ? `Vous commandez pour la table ${cart.tableNumber}`
                : "Table à préciser au moment de commander"
              : "Commande à emporter"}
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

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onEdit={editLine}
      />
    </div>
  );
}
