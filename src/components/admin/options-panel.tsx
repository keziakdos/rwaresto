"use client";

import { useState } from "react";
import { GripVertical, Loader2, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import type { AdminOptionGroup } from "@/lib/admin-types";
import { centsToPrice, priceToCents } from "./product-editor";
import { useToast } from "../toast-provider";

type ChoiceDraft = { name: string; price: string; available: boolean };

export function OptionsPanel({
  groups,
  onChanged,
}: {
  groups: AdminOptionGroup[];
  onChanged: (message: string) => void;
}) {
  const toast = useToast();
  const [editing, setEditing] = useState<AdminOptionGroup | null>(null);
  const [creating, setCreating] = useState(false);

  async function remove(group: AdminOptionGroup) {
    if (
      !window.confirm(
        `Supprimer le groupe « ${group.name} » ? Il sera retiré des plats qui l'utilisent.`,
      )
    ) {
      return;
    }
    const response = await fetch(`/api/admin/option-groups/${group.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Suppression impossible.", type: "error" });
      return;
    }
    onChanged("Groupe d'options supprimé.");
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-display text-xl font-semibold text-ink">Options et suppléments</h2>
          <p className="mt-1 text-xs text-muted">
            Créez des groupes réutilisables (protéine, sauce, suppléments…).
          </p>
        </div>
        <button type="button" onClick={() => setCreating(true)} className="btn-primary min-h-11 px-4 text-xs">
          <Plus className="h-4 w-4" />
          Nouveau groupe
        </button>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {groups.map((group) => (
          <article key={group.id} className="rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card transition hover:shadow-soft">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-display text-lg font-semibold text-ink">{group.name}</h3>
                <div className="mt-1 flex flex-wrap gap-1">
                  <span className="badge bg-sand text-muted">
                    {group.type === "single" ? "Choix unique" : "Choix multiple"}
                  </span>
                  {group.required ? (
                    <span className="badge bg-amber-50 text-amber-700">Obligatoire</span>
                  ) : (
                    <span className="badge bg-cream/50 text-muted">Facultatif</span>
                  )}
                  {group._count ? (
                    <span className="badge bg-sky-50 text-sky-700">
                      {group._count.products} plat{group._count.products > 1 ? "s" : ""}
                    </span>
                  ) : null}
                </div>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(group)}
                  className="rounded-lg p-2 text-muted hover:bg-sand hover:text-forest"
                  aria-label={`Modifier ${group.name}`}
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => remove(group)}
                  className="rounded-lg p-2 text-muted/40 hover:bg-red-50 hover:text-red-600"
                  aria-label={`Supprimer ${group.name}`}
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            <div className="mt-3 divide-y divide-line/60">
              {group.choices.map((choice) => (
                <div key={choice.id} className="flex items-center justify-between gap-2 py-1.5">
                  <span className={`text-xs font-bold ${choice.available ? "text-muted" : "text-muted/40 line-through"}`}>
                    {choice.name}
                  </span>
                  <span className="text-xs font-extrabold text-muted">
                    {choice.priceDeltaCents === 0
                      ? "inclus"
                      : `${choice.priceDeltaCents > 0 ? "+" : ""}${(choice.priceDeltaCents / 100).toFixed(2).replace(".", ",")} €`}
                  </span>
                </div>
              ))}
            </div>
          </article>
        ))}
        {!groups.length ? (
          <div className="rounded-2xl border border-dashed border-line bg-surface/50 px-4 py-10 text-center text-sm font-semibold text-muted">
            Aucun groupe d'options. Créez-en un pour proposer des choix.
          </div>
        ) : null}
      </div>

      {creating || editing ? (
        <GroupEditor
          group={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(message) => {
            setCreating(false);
            setEditing(null);
            onChanged(message);
          }}
        />
      ) : null}
    </div>
  );
}

function GroupEditor({
  group,
  onClose,
  onSaved,
}: {
  group: AdminOptionGroup | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const toast = useToast();
  const [name, setName] = useState(group?.name || "");
  const [type, setType] = useState<"single" | "multiple">(
    group?.type === "multiple" ? "multiple" : "single",
  );
  const [required, setRequired] = useState(group?.required || false);
  const [minSelections, setMinSelections] = useState(group?.minSelections ?? 0);
  const [maxSelections, setMaxSelections] = useState(group?.maxSelections ?? 1);
  const [choices, setChoices] = useState<ChoiceDraft[]>(
    group?.choices.map((choice) => ({
      name: choice.name,
      price: centsToPrice(choice.priceDeltaCents),
      available: choice.available,
    })) || [{ name: "", price: "0,00", available: true }],
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  function updateChoice(index: number, patch: Partial<ChoiceDraft>) {
    setChoices((current) =>
      current.map((choice, position) => (position === index ? { ...choice, ...patch } : choice)),
    );
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    const payloadChoices: { name: string; priceDeltaCents: number; available: boolean }[] = [];
    for (const choice of choices) {
      if (!choice.name.trim()) {
        setError("Chaque choix doit avoir un nom.");
        return;
      }
      const cents = priceToCents(choice.price || "0");
      if (cents === null) {
        setError(`Prix invalide pour « ${choice.name} ».`);
        return;
      }
      payloadChoices.push({
        name: choice.name.trim(),
        priceDeltaCents: cents,
        available: choice.available,
      });
    }
    if (!name.trim()) {
      setError("Nom du groupe requis.");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(
        group ? `/api/admin/option-groups/${group.id}` : "/api/admin/option-groups",
        {
          method: group ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            type,
            required,
            minSelections,
            maxSelections,
            choices: payloadChoices,
          }),
        },
      );
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      onSaved(group ? "Groupe d'options enregistré." : "Groupe d'options créé.");
    } catch {
      setError("Une erreur réseau est survenue.");
      toast.show({ message: "Enregistrement impossible.", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1a120c]/55" aria-label="Fermer" />
      <form
        onSubmit={submit}
        className="relative flex max-h-[95dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-[1.8rem] border border-line/70 bg-surface shadow-lift animate-slide-up sm:rounded-[1.8rem]"
      >
        <div className="flex items-center justify-between border-b border-line/60 px-4 py-3">
          <h2 className="font-display text-xl font-semibold text-ink">
            {group ? "Modifier le groupe" : "Nouveau groupe d'options"}
          </h2>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-sand" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
          <div>
            <label htmlFor="group-name" className="admin-label">
              Nom du groupe *
            </label>
            <input
              id="group-name"
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              className="field"
              placeholder="Ex. Protéine, Sauce, Suppléments"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="group-type" className="admin-label">
                Type de choix
              </label>
              <select
                id="group-type"
                value={type}
                onChange={(event) => {
                  const next = event.target.value as "single" | "multiple";
                  setType(next);
                  if (next === "single") {
                    setMaxSelections(1);
                    if (minSelections > 1) setMinSelections(1);
                  }
                }}
                className="field"
              >
                <option value="single">Choix unique</option>
                <option value="multiple">Choix multiple</option>
              </select>
            </div>
            <label className="mt-5 flex cursor-pointer items-center justify-between rounded-xl border border-line px-3">
              <span className="text-xs font-extrabold text-ink">Obligatoire</span>
              <input
                type="checkbox"
                checked={required}
                onChange={(event) => {
                  setRequired(event.target.checked);
                  if (event.target.checked && minSelections < 1) setMinSelections(1);
                  if (!event.target.checked) setMinSelections(0);
                }}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="group-min" className="admin-label">
                Minimum
              </label>
              <input
                id="group-min"
                type="number"
                min={0}
                max={maxSelections}
                value={minSelections}
                onChange={(event) => setMinSelections(Math.max(0, Number(event.target.value)))}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="group-max" className="admin-label">
                Maximum
              </label>
              <input
                id="group-max"
                type="number"
                min={1}
                max={20}
                value={maxSelections}
                disabled={type === "single"}
                onChange={(event) => setMaxSelections(Math.max(1, Number(event.target.value)))}
                className="field disabled:bg-sand disabled:text-muted"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <p className="admin-label mb-0">Choix proposés *</p>
              <button
                type="button"
                onClick={() => setChoices((current) => [...current, { name: "", price: "0,00", available: true }])}
                className="flex items-center gap-1 text-[11px] font-extrabold text-brand"
              >
                <Plus className="h-3.5 w-3.5" />
                Ajouter un choix
              </button>
            </div>
            <div className="mt-2 space-y-2">
              {choices.map((choice, index) => (
                <div key={index} className="flex items-center gap-2 rounded-xl border border-line p-2">
                  <GripVertical className="h-4 w-4 shrink-0 text-muted/40" />
                  <input
                    value={choice.name}
                    onChange={(event) => updateChoice(index, { name: event.target.value.slice(0, 60) })}
                    placeholder="Nom du choix"
                    className="field h-9 flex-1 px-2.5 py-1 text-xs"
                    aria-label={`Nom du choix ${index + 1}`}
                  />
                  <div className="relative w-24 shrink-0">
                    <input
                      value={choice.price}
                      onChange={(event) => updateChoice(index, { price: event.target.value })}
                      inputMode="decimal"
                      className="field h-9 px-2 py-1 pr-6 text-xs"
                      aria-label={`Supplément du choix ${index + 1} en euros`}
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted">€</span>
                  </div>
                  <label className="flex shrink-0 items-center" title="Disponible">
                    <input
                      type="checkbox"
                      checked={choice.available}
                      onChange={(event) => updateChoice(index, { available: event.target.checked })}
                      className="h-4 w-4 accent-[var(--color-brand)]"
                      aria-label={`Disponible : ${choice.name || index + 1}`}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => setChoices((current) => current.filter((_, position) => position !== index))}
                    disabled={choices.length === 1}
                    className="rounded p-1 text-muted/40 hover:text-red-600 disabled:opacity-30"
                    aria-label="Retirer ce choix"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <p className="mt-1.5 text-[10px] text-muted">
              Un supplément négatif est possible (ex. -1,00 € pour une option plus simple).
            </p>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </p>
          ) : null}
        </div>
        <div className="flex gap-2 border-t border-line/60 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
