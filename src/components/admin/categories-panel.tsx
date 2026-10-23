"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  ArrowDown,
  ArrowUp,
  Clock3,
  GripVertical,
  ImagePlus,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { AdminCategory } from "@/lib/admin-types";
import { useToast } from "../toast-provider";

function serviceLabel(category: AdminCategory) {
  if (!category.availableFrom && !category.availableTo) return "Toute la journée";
  const from = category.availableFrom?.replace(":", "h") || "…";
  const to = category.availableTo?.replace(":", "h") || "…";
  return `${from} – ${to}`;
}

export function CategoriesPanel({
  categories,
  onChanged,
}: {
  categories: AdminCategory[];
  onChanged: (message: string) => void;
}) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [editing, setEditing] = useState<AdminCategory | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);

  async function addCategory(event: React.FormEvent) {
    event.preventDefault();
    if (!newName.trim()) return;
    setBusy(true);
    try {
      const response = await fetch("/api/admin/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.show({ message: data.error || "Création impossible.", type: "error" });
        return;
      }
      setNewName("");
      onChanged("Catégorie créée.");
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(category: AdminCategory) {
    const response = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !category.active }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Modification impossible.", type: "error" });
      return;
    }
    onChanged(category.active ? "Catégorie masquée." : "Catégorie visible.");
  }

  async function remove(category: AdminCategory) {
    if (
      !window.confirm(
        `Supprimer la catégorie « ${category.name} » ?${
          category._count.products ? " Elle contient des plats et ne pourra pas être supprimée." : ""
        }`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/admin/categories/${category.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Suppression impossible.", type: "error" });
      return;
    }
    onChanged("Catégorie supprimée.");
  }

  async function saveOrder(next: AdminCategory[]) {
    const response = await fetch("/api/admin/categories/reorder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: next.map((category) => category.id) }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Réorganisation impossible.", type: "error" });
      return;
    }
    onChanged("Ordre des catégories enregistré.");
  }

  function move(category: AdminCategory, direction: -1 | 1) {
    const index = categories.findIndex((item) => item.id === category.id);
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  }

  function drop(targetId: string) {
    if (!dragId || dragId === targetId) return;
    const from = categories.findIndex((item) => item.id === dragId);
    const to = categories.findIndex((item) => item.id === targetId);
    if (from < 0 || to < 0) return;
    const next = [...categories];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setDragId(null);
    saveOrder(next);
  }

  return (
    <div>
      <div>
        <h2 className="font-display text-xl font-semibold text-ink">Catégories & services</h2>
        <p className="mt-1 text-xs text-muted">
          Photo, horaires de service et ordre d&apos;affichage. Le petit-déjeuner peut être réservé à 9h–11h, la carte complète à partir de 11h.
        </p>
      </div>

      <div className="mt-4 space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            draggable
            onDragStart={() => setDragId(category.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => drop(category.id)}
            className={`flex flex-wrap items-center gap-2 rounded-2xl border bg-surface p-3 shadow-sm transition ${
              dragId === category.id ? "border-brand opacity-60" : "border-line/60"
            }`}
          >
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-muted/40" aria-hidden="true" />
            <div className="relative hidden h-11 w-14 shrink-0 overflow-hidden rounded-xl bg-sand sm:block">
              {category.image ? (
                <Image src={category.image} alt="" fill sizes="56px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted/40">
                  <ImagePlus className="h-4 w-4" />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-ink">{category.name}</p>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] font-semibold text-muted">
                <span>{category._count.products} plat{category._count.products > 1 ? "s" : ""}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3 w-3" />
                  {serviceLabel(category)}
                </span>
                <span>{category.active ? "visible" : "masquée"}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleActive(category)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                category.active ? "bg-emerald-50 text-emerald-700" : "bg-sand text-muted"
              }`}
              title={category.active ? "Masquer la catégorie" : "Afficher la catégorie"}
            >
              {category.active ? "Visible" : "Masquée"}
            </button>
            <div className="flex shrink-0 gap-0.5">
              <button type="button" onClick={() => move(category, -1)} className="rounded p-1.5 text-muted/40 hover:bg-sand hover:text-muted" aria-label="Monter">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(category, 1)} className="rounded p-1.5 text-muted/40 hover:bg-sand hover:text-muted" aria-label="Descendre">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setEditing(category)}
                className="rounded p-1.5 text-muted hover:bg-sand hover:text-forest"
                aria-label={`Modifier ${category.name}`}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => remove(category)} className="rounded p-1.5 text-muted/40 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addCategory} className="mt-4 flex gap-2 rounded-2xl border border-dashed border-line bg-cream/50 p-2.5">
        <input
          value={newName}
          onChange={(event) => setNewName(event.target.value.slice(0, 50))}
          placeholder="Nouvelle catégorie (ex. Salades)"
          className="field h-10 flex-1 text-sm"
          aria-label="Nom de la nouvelle catégorie"
        />
        <button type="submit" disabled={busy || !newName.trim()} className="btn-primary min-h-10 px-4 text-xs">
          <Plus className="h-4 w-4" />
          Ajouter
        </button>
      </form>

      {editing ? (
        <CategoryEditor
          category={editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            onChanged(message);
          }}
        />
      ) : null}
    </div>
  );
}

function CategoryEditor({
  category,
  onClose,
  onSaved,
}: {
  category: AdminCategory;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(category.name);
  const [image, setImage] = useState<string | null>(category.image);
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [from, setFrom] = useState(category.availableFrom || "");
  const [to, setTo] = useState(category.availableTo || "");
  const [active, setActive] = useState(category.active);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
    setPreview(URL.createObjectURL(selected));
    setFile(selected);
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
    if (name.trim().length < 2) {
      setError("Le nom doit contenir au moins 2 caractères.");
      return;
    }
    if (from && !to) {
      setError("Indiquez aussi l'heure de fin de service.");
      return;
    }
    if (to && !from) {
      setError("Indiquez aussi l'heure de début de service.");
      return;
    }
    setSaving(true);
    setError("");
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
      const response = await fetch(`/api/admin/categories/${category.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          image: imageUrl || null,
          availableFrom: from || null,
          availableTo: to || null,
          active,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      onSaved("Catégorie enregistrée.");
    } catch {
      setError("Une erreur réseau est survenue.");
      toast.show({ message: "Enregistrement impossible.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  const displayImage = preview || image;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1a120c]/55 backdrop-blur-sm" aria-label="Fermer" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.8rem] border border-line/70 bg-surface shadow-lift animate-slide-up sm:rounded-[1.8rem]"
      >
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3.5">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Modifier la catégorie</h2>
            <p className="text-[11px] font-semibold text-muted">Photo, nom et plage horaire de service.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-sand" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
          <div className="grid gap-4 sm:grid-cols-[150px_1fr]">
            <div>
              <p className="admin-label">Photo</p>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl border border-dashed border-line bg-cream/50">
                {displayImage ? (
                  <Image src={displayImage} alt="" fill unoptimized className="object-cover" />
                ) : (
                  <div className="flex h-full flex-col items-center justify-center text-muted/40">
                    <ImagePlus className="h-7 w-7" />
                    <p className="mt-1 text-[10px] font-bold">Aucune photo</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                onChange={(event) => chooseFile(event.target.files?.[0] || null)}
                className="hidden"
                id={`category-photo-${category.id}`}
              />
              <div className="mt-2 grid grid-cols-2 gap-1.5">
                <label htmlFor={`category-photo-${category.id}`} className="btn-secondary min-h-9 cursor-pointer px-2 text-[10px]">
                  <Upload className="h-3.5 w-3.5" />
                  Choisir
                </label>
                <button type="button" onClick={removeImage} disabled={!displayImage} className="btn-ghost min-h-9 px-2 text-[10px] text-red-600">
                  <Trash2 className="h-3.5 w-3.5" />
                  Retirer
                </button>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label htmlFor={`category-name-${category.id}`} className="admin-label">
                  Nom de la catégorie *
                </label>
                <input
                  id={`category-name-${category.id}`}
                  value={name}
                  onChange={(event) => setName(event.target.value.slice(0, 50))}
                  className="field"
                  required
                />
              </div>
              <div>
                <p className="admin-label">Plage de service</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor={`category-from-${category.id}`} className="mb-1 block text-[10px] font-bold text-muted">Début</label>
                    <input id={`category-from-${category.id}`} type="time" value={from} onChange={(event) => setFrom(event.target.value)} className="field h-10" />
                  </div>
                  <div>
                    <label htmlFor={`category-to-${category.id}`} className="mb-1 block text-[10px] font-bold text-muted">Fin</label>
                    <input id={`category-to-${category.id}`} type="time" value={to} onChange={(event) => setTo(event.target.value)} className="field h-10" />
                  </div>
                </div>
                <p className="mt-1.5 text-[10px] leading-snug text-muted">
                  Exemple petit-déjeuner : 09:00–11:00. Carte complète : 11:00–01:00. Laissez vide pour toute la journée.
                </p>
              </div>
              <label className="flex cursor-pointer items-center justify-between rounded-xl border border-line p-3">
                <span>
                  <span className="block text-xs font-extrabold text-ink">Catégorie visible</span>
                  <span className="text-[10px] text-muted">Masquer sans supprimer les plats</span>
                </span>
                <input type="checkbox" checked={active} onChange={(event) => setActive(event.target.checked)} className="h-5 w-5 accent-[var(--color-brand)]" />
              </label>
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex gap-2 border-t border-line/60 bg-surface px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
