"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, GripVertical, Pencil, Plus, Trash2, X } from "lucide-react";
import type { AdminCategory } from "@/lib/admin-types";
import { useToast } from "../toast-provider";

export function CategoriesPanel({
  categories,
  onChanged,
}: {
  categories: AdminCategory[];
  onChanged: (message: string) => void;
}) {
  const toast = useToast();
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
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

  async function rename(category: AdminCategory) {
    if (!editName.trim() || editName.trim() === category.name) {
      setEditingId(null);
      return;
    }
    const response = await fetch(`/api/admin/categories/${category.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editName.trim() }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Renommage impossible.", type: "error" });
      return;
    }
    setEditingId(null);
    onChanged("Catégorie renommée.");
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
        <h2 className="font-display text-lg font-bold text-forest">Catégories</h2>
        <p className="text-xs text-stone-500">
          Glissez-déposez pour réordonner. Une catégorie contenant des plats ne peut pas être supprimée.
        </p>
      </div>

      <div className="mt-3 space-y-2">
        {categories.map((category) => (
          <div
            key={category.id}
            draggable
            onDragStart={() => setDragId(category.id)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => drop(category.id)}
            className={`flex items-center gap-2 rounded-xl border bg-white p-2.5 shadow-sm transition ${
              dragId === category.id ? "border-brand opacity-60" : "border-black/5"
            }`}
          >
            <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-stone-300" aria-hidden="true" />
            {editingId === category.id ? (
              <div className="flex min-w-0 flex-1 items-center gap-1.5">
                <input
                  value={editName}
                  onChange={(event) => setEditName(event.target.value.slice(0, 50))}
                  className="field h-9 px-2 py-1 text-sm"
                  autoFocus
                  onKeyDown={(event) => {
                    if (event.key === "Enter") rename(category);
                    if (event.key === "Escape") setEditingId(null);
                  }}
                />
                <button type="button" onClick={() => rename(category)} className="rounded bg-forest p-1.5 text-white" aria-label="Enregistrer">
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button type="button" onClick={() => setEditingId(null)} className="rounded bg-stone-100 p-1.5 text-stone-500" aria-label="Annuler">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-extrabold text-stone-800">{category.name}</p>
                <p className="text-[10px] font-semibold text-stone-400">
                  {category._count.products} plat{category._count.products > 1 ? "s" : ""} ·{" "}
                  {category.active ? "visible" : "masquée"}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => toggleActive(category)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-extrabold ${
                category.active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400"
              }`}
              title={category.active ? "Masquer la catégorie" : "Afficher la catégorie"}
            >
              {category.active ? "Visible" : "Masquée"}
            </button>
            <div className="flex shrink-0 gap-0.5">
              <button type="button" onClick={() => move(category, -1)} className="rounded p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600" aria-label="Monter">
                <ArrowUp className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => move(category, 1)} className="rounded p-1.5 text-stone-300 hover:bg-stone-100 hover:text-stone-600" aria-label="Descendre">
                <ArrowDown className="h-3.5 w-3.5" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setEditingId(category.id);
                  setEditName(category.name);
                }}
                className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-forest"
                aria-label="Renommer"
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button type="button" onClick={() => remove(category)} className="rounded p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-600" aria-label="Supprimer">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      <form onSubmit={addCategory} className="mt-4 flex gap-2 rounded-xl border border-dashed border-stone-300 bg-white/60 p-2.5">
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
    </div>
  );
}
