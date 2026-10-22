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
      <div className="flex items-center justify-center py-24 text-sm font-bold text-stone-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Chargement du menu…
      </div>
    );
  }

  if (!catalog) {
    return (
      <div className="rounded-2xl bg-white p-8 text-center">
        <p className="font-bold text-stone-600">{error}</p>
        <button type="button" onClick={() => load()} className="btn-primary mt-4">
          <RefreshCw className="h-4 w-4" />
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Catalogue</p>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Gestion du menu</h1>
          <p className="mt-1 text-sm text-stone-500">
            Les modifications sont visibles immédiatement sur le site public, sans redéploiement.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/menu" target="_blank" className="btn-secondary min-h-10 px-3 text-xs">
            <Eye className="h-4 w-4" />
            Aperçu client
          </Link>
          <button type="button" onClick={() => setEditingProduct("new")} className="btn-primary min-h-10 px-4 text-xs">
            <Plus className="h-4 w-4" />
            Ajouter un plat
          </button>
        </div>
      </div>

      <div className="mt-4 flex gap-1 overflow-x-auto rounded-full bg-stone-200/70 p-1">
        <button
          type="button"
          onClick={() => setTab("products")}
          className={`flex shrink-0 items-center gap-1.5 rounded-full px-4 py-2 text-xs font-extrabold ${
            tab === "products" ? "bg-white text-forest shadow-sm" : "text-stone-500"
          }`}
        >
          <UtensilsCrossed className="h-3.5 w-3.5" />
          Plats ({catalog.products.filter((product) => !product.archived).length})
        </button>
        <button
          type="button"
          onClick={() => setTab("categories")}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${
            tab === "categories" ? "bg-white text-forest shadow-sm" : "text-stone-500"
          }`}
        >
          Catégories ({catalog.categories.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("options")}
          className={`shrink-0 rounded-full px-4 py-2 text-xs font-extrabold ${
            tab === "options" ? "bg-white text-forest shadow-sm" : "text-stone-500"
          }`}
        >
          Options ({catalog.optionGroups.length})
        </button>
      </div>

      {tab === "products" ? (
        <div className="mt-4">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Rechercher un plat…"
                className="field h-11 rounded-full pl-10 pr-10 text-sm"
                aria-label="Rechercher un plat"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-stone-400"
                  aria-label="Effacer"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="field h-11 w-full rounded-full text-sm sm:w-52"
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
              className={`btn-secondary h-11 shrink-0 px-3 text-xs ${showArchived ? "border-brand text-brand" : ""}`}
            >
              <ArchiveRestore className="h-4 w-4" />
              Archives
            </button>
          </div>

          <div className="mt-3 space-y-2">
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
              <div className="rounded-2xl border border-dashed border-stone-300 bg-white/50 px-4 py-12 text-center text-sm font-semibold text-stone-400">
                Aucun plat ne correspond à ces filtres.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {tab === "categories" ? (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card">
          <CategoriesPanel categories={catalog.categories} onChanged={changed} />
        </div>
      ) : null}

      {tab === "options" ? (
        <div className="mt-4 rounded-2xl border border-black/5 bg-white p-4 shadow-card">
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
    <article className={`rounded-2xl border border-black/5 bg-white p-2.5 shadow-sm sm:p-3 ${product.archived ? "opacity-65" : ""}`}>
      <div className="flex items-center gap-2.5">
        <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl bg-stone-100 sm:h-16 sm:w-20">
          {product.image ? (
            <Image src={product.image} alt="" fill sizes="80px" className={`object-cover ${!product.available ? "grayscale" : ""}`} />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Image src="/logo.png" alt="" width={30} height={30} className="opacity-25" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="truncate text-sm font-extrabold text-stone-800">{product.name}</h3>
            {product.archived ? (
              <span className="badge bg-stone-200 text-stone-500">Archivé</span>
            ) : !product.available ? (
              <span className="badge bg-red-50 text-red-700">Épuisé</span>
            ) : null}
            {product.hidden && !product.archived ? (
              <span className="badge bg-amber-50 text-amber-700">Masqué</span>
            ) : null}
            {product.isNew ? <span className="badge bg-rose-50 text-rose-700">Nouveau</span> : null}
          </div>
          <p className="truncate text-[10px] text-stone-400">
            {product.category.name}
            {product.description ? ` · ${product.description}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <div className="flex items-center rounded-lg border border-stone-200 bg-white px-1">
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
                className="h-7 w-14 bg-transparent px-1 text-right text-xs font-extrabold text-stone-800 outline-none"
                aria-label={`Prix de ${product.name} en euros`}
                disabled={savingPrice}
              />
              <span className="pr-1 text-[10px] font-bold text-stone-400">€</span>
            </div>
            <span className="text-[10px] font-semibold text-stone-400">
              {product._count.orderItems} commande{product._count.orderItems > 1 ? "s" : ""}
            </span>
            {savingPrice ? <Loader2 className="h-3 w-3 animate-spin text-stone-400" /> : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-col gap-1">
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={() => onMove(-1)}
              className="rounded p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Monter le plat"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onMove(1)}
              className="rounded p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Descendre le plat"
            >
              <ArrowDown className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-0.5">
            <button
              type="button"
              onClick={onEdit}
              disabled={busy}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-forest"
              aria-label={`Modifier ${product.name}`}
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onAction("duplicate")}
              disabled={busy}
              className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-forest"
              aria-label={`Dupliquer ${product.name}`}
              title="Dupliquer"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-2">
        {!product.archived ? (
          <>
            <button
              type="button"
              onClick={() => onAction("available")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                product.available ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
              }`}
            >
              <ToggleLeft className="h-3 w-3" />
              {product.available ? "Disponible" : "Épuisé"}
            </button>
            <button
              type="button"
              onClick={() => onAction("hidden")}
              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                product.hidden ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-500"
              }`}
            >
              {product.hidden ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
              {product.hidden ? "Masqué du menu" : "Visible"}
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onAction("restore")}
            className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-1 text-[10px] font-extrabold text-sky-700"
          >
            <ArchiveRestore className="h-3 w-3" />
            Restaurer
          </button>
        )}
        <button
          type="button"
          onClick={() => onAction("delete")}
          className="ml-auto inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold text-stone-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 className="h-3 w-3" />
          {product._count.orderItems ? "Archiver" : "Supprimer"}
        </button>
      </div>
    </article>
  );
}
