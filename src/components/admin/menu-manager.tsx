"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArchiveRestore,
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ToggleLeft,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import type { AdminCatalog, AdminProduct } from "@/lib/admin-types";
import { centsToPrice, ProductEditor, priceToCents } from "./product-editor";
import { CategoriesPanel } from "./categories-panel";
import { OptionsPanel } from "./options-panel";
import { useToast } from "../toast-provider";

export function MenuManager() {
  const toast = useToast();
  const [catalog, setCatalog] = useState<AdminCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState<"products" | "categories" | "options">("products");
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showArchived, setShowArchived] = useState(false);
  const [editingProduct, setEditingProduct] = useState<AdminProduct | null | "new">(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      try {
        const response = await fetch("/api/admin/catalog", { cache: "no-store" });
        if (!response.ok) throw new Error("catalog");
        setCatalog(await response.json());
        setError("");
      } catch {
        setError("Impossible de charger le catalogue.");
      } finally {
        if (!silent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load();
  }, [load]);

  const changed = useCallback(
    (message: string) => {
      toast.show({ message, type: "success" });
      load(true);
    },
    [load, toast],
  );

  const products = useMemo(() => {
    if (!catalog) return [];
    const categoryOrder = new Map(catalog.categories.map((category, index) => [category.id, index]));
    return [...catalog.products]
      .filter((product) => (showArchived ? true : !product.archived))
      .filter((product) => categoryFilter === "all" || product.categoryId === categoryFilter)
      .filter((product) => {
        const term = query.trim().toLowerCase();
        if (!term) return true;
        return (
          product.name.toLowerCase().includes(term) ||
          product.description.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        const categoryDiff =
          (categoryOrder.get(a.categoryId) ?? 99) - (categoryOrder.get(b.categoryId) ?? 99);
        return categoryDiff || a.sortOrder - b.sortOrder;
      });
  }, [catalog, query, categoryFilter, showArchived]);

  async function productAction(
    product: AdminProduct,
    action: "duplicate" | "delete" | "restore" | "available" | "hidden",
  ) {
    setBusyId(product.id);
    try {
      if (action === "duplicate") {
        const response = await fetch(`/api/admin/products/${product.id}/duplicate`, { method: "POST" });
        const data = await response.json();
        if (!response.ok) {
          toast.show({ message: data.error || "Duplication impossible.", type: "error" });
          return;
        }
        changed("Plat dupliqué. La copie est masquée du menu.");
      } else if (action === "delete") {
        if (
          !window.confirm(
            `Supprimer « ${product.name} » ?${
              product._count.orderItems
                ? " Ce plat figure dans des commandes passées : il sera archivé pour garder l'historique."
                : ""
            }`,
          )
        ) {
          return;
        }
        const response = await fetch(`/api/admin/products/${product.id}`, { method: "DELETE" });
        const data = await response.json();
        if (!response.ok) {
          toast.show({ message: data.error || "Suppression impossible.", type: "error" });
          return;
        }
        changed(data.archived ? "Plat archivé, historique conservé." : "Plat supprimé.");
      } else {
        const patch =
          action === "restore"
            ? { archived: false, hidden: false, available: true }
            : action === "available"
              ? { available: !product.available }
              : { hidden: !product.hidden };
        const response = await fetch(`/api/admin/products/${product.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        const data = await response.json();
        if (!response.ok) {
          toast.show({ message: data.error || "Modification impossible.", type: "error" });
          return;
        }
        changed(
          action === "restore"
            ? "Plat restauré et de nouveau visible."
            : action === "available"
              ? product.available
                ? "Plat marqué épuisé."
                : "Plat de nouveau disponible."
              : product.hidden
                ? "Plat visible sur le menu."
                : "Plat masqué du menu.",
        );
      }
    } finally {
      setBusyId(null);
    }
  }

  async function moveProduct(product: AdminProduct, direction: -1 | 1) {
    if (!catalog) return;
    const categoryProducts = catalog.products
      .filter((item) => item.categoryId === product.categoryId && !item.archived)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const index = categoryProducts.findIndex((item) => item.id === product.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= categoryProducts.length) return;
    const next = [...categoryProducts];
    [next[index], next[target]] = [next[target], next[index]];
    setBusyId(product.id);
    try {
      const response = await fetch("/api/admin/products/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          categoryId: product.categoryId,
          ids: next.map((item) => item.id),
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.show({ message: data.error || "Réorganisation impossible.", type: "error" });
        return;
      }
      changed("Ordre des plats enregistré.");
    } finally {
      setBusyId(null);
    }
  }

  if (!catalog && loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-sm font-bold text-muted">
        <Loader2 className="mb-3 h-7 w-7 animate-spin text-brand" />
        Chargement du menu…
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="flex flex-col items-center rounded-[1.5rem] border border-line/70 bg-surface p-10 text-center shadow-card">
        <span className="flex h-14 w-14 items-center justify-center rounded-3xl bg-red-50 text-red-600">
          <UtensilsCrossed className="h-6 w-6" />
        </span>
        <p className="mt-4 font-display text-xl font-semibold text-ink">Catalogue indisponible</p>
        <p className="mt-1 text-sm text-muted">{error}</p>
        <button type="button" onClick={() => load()} className="btn-primary mt-5">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <UtensilsCrossed className="h-3.5 w-3.5" />
            Catalogue
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Le menu, à votre main.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Les modifications sont visibles immédiatement sur le site public, sans redéploiement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/menu" target="_blank" className="btn-secondary min-h-11 px-3.5 text-xs">
            <Eye className="h-4 w-4" />
            Aperçu client
          </Link>
          <button type="button" onClick={() => setEditingProduct("new")} className="btn-primary min-h-11 px-4 text-xs">
            <Plus className="h-4 w-4" />
            Ajouter un plat
          </button>
        </div>
      </header>

      <div className="mt-5 flex gap-1 overflow-x-auto rounded-full border border-line/70 bg-surface p-1 shadow-card">
        {[
          { key: "products" as const, label: "Plats", count: catalog.products.filter((product) => !product.archived).length, icon: UtensilsCrossed },
          { key: "categories" as const, label: "Catégories", count: catalog.categories.length },
          { key: "options" as const, label: "Options", count: catalog.optionGroups.length },
        ].map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-xs font-extrabold transition ${
              tab === item.key ? "bg-forest text-white shadow-card" : "text-muted hover:text-ink"
            }`}
          >
            {item.icon ? <item.icon className="h-3.5 w-3.5" /> : null}
            {item.label}
            <span className={`rounded-full px-1.5 py-0.5 text-[9px] ${tab === item.key ? "bg-white/15 text-white" : "bg-sand text-muted"}`}>
              {item.count}
            </span>
          </button>
        ))}
      </div>

      {tab === "products" ? (
        <div className="mt-4">
          <div className="admin-toolbar">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un plat, une description…"
                className="h-11 w-full rounded-xl border-0 bg-sand/45 pl-10 pr-10 text-sm font-medium text-ink outline-none transition placeholder:text-muted/65 focus:bg-sand/70 focus:ring-4 focus:ring-brand/10"
                aria-label="Rechercher un plat"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full bg-surface text-muted shadow-sm hover:text-ink"
                  aria-label="Effacer"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="h-11 w-full rounded-xl border border-line/70 bg-surface px-3 text-sm font-bold text-ink outline-none transition focus:ring-4 focus:ring-brand/10 sm:w-52"
              aria-label="Filtrer par catégorie"
            >
              <option value="all">Toutes les catégories</option>
              {catalog.categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowArchived((value) => !value)}
              className={`inline-flex h-11 shrink-0 items-center gap-1.5 rounded-xl border px-3 text-xs font-extrabold transition ${
                showArchived ? "border-brand bg-brand-soft text-brand-dark" : "border-line/70 bg-surface text-muted hover:text-ink"
              }`}
            >
              <ArchiveRestore className="h-4 w-4" />
              Archives
            </button>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
            {products.map((product) => (
              <ProductRow
                key={product.id}
                product={product}
                busy={busyId === product.id}
                onEdit={() => setEditingProduct(product)}
                onAction={(action) => productAction(product, action)}
                onMove={(direction) => moveProduct(product, direction)}
                onPriceSaved={() => changed("Prix enregistré.")}
              />
            ))}
            {!products.length ? (
              <div className="flex flex-col items-center rounded-[1.4rem] border border-dashed border-line bg-surface/50 px-4 py-14 text-center sm:col-span-2 xl:col-span-3 2xl:col-span-4">
                <Search className="h-6 w-6 text-muted/40" />
                <p className="mt-3 text-sm font-bold text-ink">Aucun plat trouvé</p>
                <p className="mt-1 text-xs text-muted">Modifiez la recherche ou les filtres.</p>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "categories" ? (
        <div className="mt-4 rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card">
          <CategoriesPanel categories={catalog.categories} onChanged={changed} />
        </div>
      ) : null}

      {tab === "options" ? (
        <div className="mt-4 rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card">
          <OptionsPanel groups={catalog.optionGroups} onChanged={changed} />
        </div>
      ) : null}

      {editingProduct ? (
        <ProductEditor
          product={editingProduct === "new" ? null : editingProduct}
          categories={catalog.categories}
          optionGroups={catalog.optionGroups}
          onClose={() => setEditingProduct(null)}
          onSaved={(message) => {
            setEditingProduct(null);
            changed(message);
          }}
        />
      ) : null}
    </div>
  );
}

function ProductRow({
  product,
  busy,
  onEdit,
  onAction,
  onMove,
  onPriceSaved,
}: {
  product: AdminProduct;
  busy: boolean;
  onEdit: () => void;
  onAction: (action: "duplicate" | "delete" | "restore" | "available" | "hidden") => void;
  onMove: (direction: -1 | 1) => void;
  onPriceSaved: () => void;
}) {
  const toast = useToast();
  const [price, setPrice] = useState(centsToPrice(product.priceCents));
  const [savingPrice, setSavingPrice] = useState(false);

  useEffect(() => {
    setPrice(centsToPrice(product.priceCents));
  }, [product.priceCents]);

  async function savePrice() {
    const cents = priceToCents(price);
    if (cents === null) {
      toast.show({ message: "Prix invalide.", type: "error" });
      setPrice(centsToPrice(product.priceCents));
      return;
    }
    if (cents === product.priceCents) return;
    setSavingPrice(true);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceCents: cents }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.show({ message: data.error || "Enregistrement impossible.", type: "error" });
        setPrice(centsToPrice(product.priceCents));
        return;
      }
      onPriceSaved();
    } finally {
      setSavingPrice(false);
    }
  }

  return (
    <article className={`group flex flex-col overflow-hidden rounded-[1.3rem] border border-line/70 bg-surface shadow-card transition hover:-translate-y-0.5 hover:shadow-soft ${product.archived ? "opacity-65" : ""}`}>
      <div className="relative aspect-[16/10] overflow-hidden bg-sand">
        {product.image ? (
          <Image
            src={product.image}
            alt=""
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
            className={`object-cover transition duration-500 group-hover:scale-[1.03] ${!product.available ? "grayscale" : ""}`}
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-gradient-to-br from-sand to-brand-soft/40">
            <Image src="/logo.png" alt="" width={46} height={46} className="opacity-25" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#1a120c]/55 via-transparent to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex flex-wrap gap-1">
          {product.archived ? (
            <span className="badge border-0 bg-stone-900/70 text-white backdrop-blur">Archivé</span>
          ) : !product.available ? (
            <span className="badge border-0 bg-red-600/90 text-white backdrop-blur">Épuisé</span>
          ) : null}
          {product.hidden && !product.archived ? (
            <span className="badge border-0 bg-amber-500/95 text-white backdrop-blur">Masqué</span>
          ) : null}
          {product.isNew ? <span className="badge border-0 bg-white/90 text-brand-dark backdrop-blur">Nouveau</span> : null}
        </div>

        <div className="absolute right-2 top-2 flex gap-1 opacity-95 sm:opacity-0 sm:transition sm:group-hover:opacity-100">
          <button
            type="button"
            onClick={onEdit}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm backdrop-blur transition hover:bg-white"
            aria-label={`Modifier ${product.name}`}
            title="Modifier"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => onAction("duplicate")}
            disabled={busy}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-ink shadow-sm backdrop-blur transition hover:bg-white"
            aria-label={`Dupliquer ${product.name}`}
            title="Dupliquer"
          >
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Copy className="h-3.5 w-3.5" />}
          </button>
        </div>

        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={() => onMove(-1)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur transition hover:bg-black/50 hover:text-white"
            aria-label="Monter le plat"
            title="Monter"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            type="button"
            onClick={() => onMove(1)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-black/30 text-white/80 backdrop-blur transition hover:bg-black/50 hover:text-white"
            aria-label="Descendre le plat"
            title="Descendre"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>

        <span className="absolute bottom-2.5 right-2.5 rounded-full bg-white/95 px-2.5 py-1 text-[9px] font-extrabold text-ink shadow-sm backdrop-blur">
          {product._count.orderItems} vente{product._count.orderItems > 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-3.5">
        <p className="text-[9px] font-extrabold uppercase tracking-[0.14em] text-brand">{product.category.name}</p>
        <h3 className="mt-1 line-clamp-1 font-display text-lg font-semibold leading-tight text-ink">{product.name}</h3>
        <p className="mt-1 line-clamp-2 min-h-8 text-[11px] leading-snug text-muted">
          {product.description || "Aucune description pour ce plat."}
        </p>

        <div className="mt-3 flex items-center justify-between gap-2">
          <div className="flex items-center rounded-xl border border-line/70 bg-cream/60 px-1.5 focus-within:ring-4 focus-within:ring-brand/10">
            <input
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              onBlur={savePrice}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.currentTarget.blur();
                }
                if (event.key === "Escape") {
                  setPrice(centsToPrice(product.priceCents));
                  event.currentTarget.blur();
                }
              }}
              inputMode="decimal"
              className="h-8 w-14 bg-transparent px-1 text-right text-sm font-extrabold text-ink outline-none"
              aria-label={`Prix de ${product.name} en euros`}
              disabled={savingPrice}
            />
            <span className="pr-1 text-[11px] font-bold text-muted">€</span>
            {savingPrice ? <Loader2 className="mr-1 h-3 w-3 animate-spin text-muted" /> : null}
          </div>
          {!product.archived ? (
            <button
              type="button"
              onClick={() => onAction("available")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1.5 text-[9px] font-extrabold transition ${
                product.available ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "bg-red-50 text-red-700 hover:bg-red-100"
              }`}
            >
              <ToggleLeft className="h-3 w-3" />
              {product.available ? "Disponible" : "Épuisé"}
            </button>
          ) : null}
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-line/50 pt-2.5">
          {!product.archived ? (
            <button
              type="button"
              onClick={() => onAction("hidden")}
              className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-extrabold transition ${
                product.hidden ? "bg-amber-50 text-amber-700" : "bg-sand text-muted hover:text-ink"
              }`}
              title={product.hidden ? "Rendre visible" : "Masquer du menu"}
            >
              {product.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {product.hidden ? "Masqué" : "Visible"}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onAction("restore")}
              className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-1 text-[9px] font-extrabold text-sky-700 transition hover:bg-sky-100"
            >
              <ArchiveRestore className="h-3 w-3" />
              Restaurer
            </button>
          )}
          <button
            type="button"
            onClick={() => onAction("delete")}
            className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-bold text-muted/70 transition hover:bg-red-50 hover:text-red-600"
          >
            <Trash2 className="h-3 w-3" />
            {product._count.orderItems ? "Archiver" : "Supprimer"}
          </button>
        </div>
      </div>
    </article>
  );
}
