"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Camera, ImagePlus, Loader2, Save, Star, Trash2, X } from "lucide-react";
import type { AdminCategory, AdminOptionGroup, AdminProduct } from "@/lib/admin-types";
import { useToast } from "../toast-provider";

export function priceToCents(value: string): number | null {
  const cleaned = value.replace(/\s/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const cents = Math.round(Number(cleaned) * 100);
  if (!Number.isSafeInteger(cents) || cents < 0 || cents > 1000000) return null;
  return cents;
}

export function centsToPrice(cents: number): string {
  return (cents / 100).toFixed(2).replace(".", ",");
}

const BADGE_FIELDS = [
  { key: "vegetarian", label: "Végétarien" },
  { key: "vegan", label: "Végétalien" },
  { key: "spicy", label: "Épicé" },
  { key: "halal", label: "Halal" },
  { key: "isNew", label: "Nouveau" },
] as const;

export function ProductEditor({
  product,
  categories,
  optionGroups,
  onClose,
  onSaved,
}: {
  product: AdminProduct | null;
  categories: AdminCategory[];
  optionGroups: AdminOptionGroup[];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(product?.name || "");
  const [description, setDescription] = useState(product?.description || "");
  const [price, setPrice] = useState(product ? centsToPrice(product.priceCents) : "");
  const [categoryId, setCategoryId] = useState(product?.categoryId || categories[0]?.id || "");
  const [image, setImage] = useState<string | null>(product?.image || null);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [available, setAvailable] = useState(product?.available ?? true);
  const [hidden, setHidden] = useState(product?.hidden ?? false);
  const [featured, setFeatured] = useState(product?.featured ?? false);
  const [optionGroupIds, setOptionGroupIds] = useState<string[]>(
    product?.optionGroups.map((group) => group.optionGroupId) || [],
  );
  const [badges, setBadges] = useState({
    vegetarian: product?.vegetarian || false,
    vegan: product?.vegan || false,
    spicy: product?.spicy || false,
    halal: product?.halal || false,
    isNew: product?.isNew || false,
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  function chooseFile(selected: File | null) {
    if (!selected) return;
    if (selected.size > 8 * 1024 * 1024) {
      setError("Photo trop volumineuse (8 Mo maximum).");
      return;
    }
    if (!/^image\//.test(selected.type)) {
      setError("Choisissez un fichier image.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
    setError("");
  }

  function removeImage() {
    if (preview) URL.revokeObjectURL(preview);
    setPreview(null);
    setFile(null);
    setImage(null);
    if (fileInput.current) fileInput.current.value = "";
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const priceCents = priceToCents(price);
    if (name.trim().length < 2) {
      setError("Le nom du plat doit contenir au moins 2 caractères.");
      return;
    }
    if (priceCents === null) {
      setError("Prix invalide (exemple : 12,50).");
      return;
    }
    if (!categoryId) {
      setError("Choisissez une catégorie.");
      return;
    }

    setSaving(true);
    try {
      let imageUrl = image;
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "product");
        const upload = await fetch("/api/admin/upload", { method: "POST", body: form });
        const uploadData = await upload.json();
        if (!upload.ok) {
          setError(uploadData.error || "Téléversement impossible.");
          return;
        }
        imageUrl = uploadData.url;
      }

      const payload = {
        name: name.trim(),
        description: description.trim(),
        priceCents,
        categoryId,
        image: imageUrl,
        available,
        hidden,
        featured,
        ...badges,
        optionGroupIds,
      };
      const response = await fetch(
        product ? `/api/admin/products/${product.id}` : "/api/admin/products",
        {
          method: product ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      onSaved(product ? "Plat enregistré." : "Nouveau plat ajouté au menu.");
    } catch {
      setError("Une erreur réseau est survenue.");
      toast.show({ message: "Enregistrement impossible.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  function requestClose() {
    if (saving) return;
    if (window.confirm("Fermer sans enregistrer les modifications ?")) onClose();
  }

  const displayImage = preview || image;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" onClick={requestClose} className="absolute inset-0 bg-[#1a120c]/55 backdrop-blur-[2px]" aria-label="Fermer" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[95dvh] w-full max-w-2xl flex-col overflow-hidden rounded-t-[1.8rem] border border-line/70 bg-surface shadow-lift animate-slide-up sm:rounded-[1.8rem]"
      >
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3.5">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">
              {product ? "Modifier le plat" : "Nouveau plat"}
            </h2>
            <p className="text-[11px] font-semibold text-muted">
              Photo recadrée au centre et convertie automatiquement en WebP.
            </p>
          </div>
          <button type="button" onClick={requestClose} className="rounded-full p-2 text-muted hover:bg-sand" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-[190px_1fr]">
            <div>
              <p className="admin-label">Photo</p>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-line bg-cream/50">
                {displayImage ? (
                  <Image src={displayImage} alt="Aperçu du plat" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted/40">
                    <ImagePlus className="h-8 w-8" />
                    <p className="mt-1 text-[11px] font-bold">Aucune photo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                capture="environment"
                onChange={(event) => chooseFile(event.target.files?.[0] || null)}
                className="hidden"
                id="product-photo"
              />
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <label htmlFor="product-photo" className="btn-secondary min-h-9 cursor-pointer px-2 text-[11px]">
                  <Camera className="h-3.5 w-3.5" />
                  Choisir
                </label>
                <button type="button" onClick={removeImage} disabled={!displayImage} className="btn-ghost min-h-9 px-2 text-[11px] text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                  Retirer
                </button>
              </div>
              <p className="mt-1.5 text-[10px] leading-snug text-muted">
                JPG, PNG, WebP ou HEIC. 8 Mo max. Aperçu avant enregistrement.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor="product-name" className="admin-label">
                  Nom du plat *
                </label>
                <input id="product-name" value={name} onChange={(event) => setName(event.target.value.slice(0, 80))} className="field" maxLength={80} required />
              </div>
              <div>
                <label htmlFor="product-description" className="admin-label">
                  Description
                </label>
                <textarea
                  id="product-description"
                  value={description}
                  onChange={(event) => setDescription(event.target.value.slice(0, 500))}
                  rows={2}
                  className="field resize-none"
                  placeholder="Ingrédients, accompagnement, sauce…"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="product-price" className="admin-label">
                    Prix (€) *
                  </label>
                  <input
                    id="product-price"
                    inputMode="decimal"
                    value={price}
                    onChange={(event) => setPrice(event.target.value)}
                    className="field"
                    placeholder="12,50"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="product-category" className="admin-label">
                    Catégorie *
                  </label>
                  <select
                    id="product-category"
                    value={categoryId}
                    onChange={(event) => setCategoryId(event.target.value)}
                    className="field"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-5 border-t border-line/60 pt-4">
            <p className="admin-label">Badges</p>
            <div className="flex flex-wrap gap-1.5">
              {BADGE_FIELDS.map((badge) => (
                <button
                  key={badge.key}
                  type="button"
                  onClick={() => setBadges((current) => ({ ...current, [badge.key]: !current[badge.key] }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                    badges[badge.key]
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-line bg-surface text-muted"
                  }`}
                  aria-pressed={badges[badge.key]}
                >
                  {badge.label}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-3">
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3">
              <span>
                <span className="block text-xs font-extrabold text-ink">Disponible</span>
                <span className="text-[10px] text-muted">Commandable par les clients</span>
              </span>
              <input
                type="checkbox"
                checked={available}
                onChange={(event) => setAvailable(event.target.checked)}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3">
              <span>
                <span className="block text-xs font-extrabold text-ink">Masqué du menu</span>
                <span className="text-[10px] text-muted">Visible seulement dans l'admin</span>
              </span>
              <input
                type="checkbox"
                checked={hidden}
                onChange={(event) => setHidden(event.target.checked)}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>
            <label className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition ${featured ? "border-brand bg-brand-soft/50" : "border-line"}`}>
              <span>
                <span className="flex items-center gap-1.5 text-xs font-extrabold text-ink">
                  <Star className={`h-3.5 w-3.5 ${featured ? "fill-brand text-brand" : "text-muted"}`} />
                  Plat spécial
                </span>
                <span className="text-[10px] text-muted">Mis en avant sur le menu</span>
              </span>
              <input
                type="checkbox"
                checked={featured}
                onChange={(event) => setFeatured(event.target.checked)}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>
          </div>

          <div className="mt-4 rounded-xl border border-line p-3">
            <p className="admin-label">Groupes d'options proposés</p>
            {optionGroups.length ? (
              <div className="grid gap-1.5 sm:grid-cols-2">
                {optionGroups.map((group) => (
                  <label key={group.id} className="flex cursor-pointer items-start gap-2 rounded-lg px-1 py-1.5 hover:bg-sand/60">
                    <input
                      type="checkbox"
                      checked={optionGroupIds.includes(group.id)}
                      onChange={(event) =>
                        setOptionGroupIds((current) =>
                          event.target.checked
                            ? [...current, group.id]
                            : current.filter((id) => id !== group.id),
                        )
                      }
                      className="mt-0.5 h-4 w-4 accent-[var(--color-brand)]"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-extrabold text-ink">{group.name}</span>
                      <span className="text-[10px] text-muted">
                        {group.type === "single" ? "Choix unique" : "Choix multiple"}
                        {group.required ? " · obligatoire" : ""} · {group.choices.length} choix
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted">
                Créez d'abord des groupes dans l'onglet « Options ».
              </p>
            )}
          </div>

          {error ? (
            <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line/60 bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={requestClose} disabled={saving} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </form>
    </div>
  );
}
