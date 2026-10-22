"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Download,
  ExternalLink,
  Loader2,
  Plus,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import { useToast } from "../toast-provider";

type DiningTable = {
  id: string;
  number: number;
  label: string | null;
  active: boolean;
};

export function TablesManager() {
  const toast = useToast();
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [number, setNumber] = useState("");
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [origin, setOrigin] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/tables", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) {
        setTables(data.tables || []);
        const nextNumber =
          (data.tables || []).reduce(
            (max: number, table: DiningTable) => Math.max(max, table.number),
            0,
          ) + 1;
        setNumber((current) => current || String(nextNumber));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    setOrigin(window.location.origin);
  }, [load]);

  async function addTable(event: React.FormEvent) {
    event.preventDefault();
    setAdding(true);
    try {
      const response = await fetch("/api/admin/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          number: Number(number),
          label: label.trim() || `Table ${number}`,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.show({ message: data.error || "Création impossible.", type: "error" });
        return;
      }
      toast.show({ message: `Table ${number} créée.`, type: "success" });
      setLabel("");
      setNumber("");
      await load();
    } finally {
      setAdding(false);
    }
  }

  async function remove(table: DiningTable) {
    if (!window.confirm(`Supprimer la table ${table.number} ?`)) return;
    const response = await fetch(`/api/admin/tables/${table.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Suppression impossible.", type: "error" });
      return;
    }
    toast.show({
      message: data.deactivated ? "Table désactivée (commandes existantes)." : "Table supprimée.",
      type: "success",
    });
    load();
  }

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase tracking-widest text-brand">Salle</p>
          <h1 className="font-display text-2xl font-bold text-forest sm:text-3xl">Tables & QR codes</h1>
          <p className="mt-1 text-sm text-stone-500">
            Chaque QR code ouvre le menu avec le numéro de table déjà renseigné.
          </p>
        </div>
        <Link href="/admin/tables/print" target="_blank" className="btn-primary min-h-10 px-4 text-xs">
          <Printer className="h-4 w-4" />
          Planche A4 à imprimer
        </Link>
      </div>

      <form onSubmit={addTable} className="mt-4 flex flex-col gap-2 rounded-2xl border border-black/5 bg-white p-3 shadow-card sm:flex-row">
        <div className="flex-1">
          <label htmlFor="new-table-number" className="admin-label">
            Numéro
          </label>
          <input
            id="new-table-number"
            type="number"
            min={1}
            max={999}
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            className="field h-10"
            required
          />
        </div>
        <div className="flex-[2]">
          <label htmlFor="new-table-label" className="admin-label">
            Libellé (facultatif)
          </label>
          <input
            id="new-table-label"
            value={label}
            onChange={(event) => setLabel(event.target.value.slice(0, 60))}
            placeholder={`Table ${number || "…"}`}
            className="field h-10"
          />
        </div>
        <button type="submit" disabled={adding} className="btn-primary min-h-10 self-end px-5 text-xs">
          {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          Ajouter
        </button>
      </form>

      {loading ? (
        <div className="flex justify-center py-16 text-stone-400">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => (
            <TableCard
              key={table.id}
              table={table}
              origin={origin}
              onChanged={(message) => {
                toast.show({ message, type: "success" });
                load();
              }}
              onRemove={() => remove(table)}
            />
          ))}
        </div>
      )}

      {!loading && !tables.length ? (
        <div className="mt-6 rounded-2xl border border-dashed border-stone-300 bg-white/50 py-14 text-center text-sm font-semibold text-stone-400">
          Aucune table. Ajoutez votre première table ci-dessus.
        </div>
      ) : null}

      <div className="mt-5 rounded-2xl bg-sky-50 p-4 text-xs leading-relaxed text-sky-900">
        <p className="font-extrabold">Conseil impression</p>
        <p className="mt-1">
          Imprimez la planche A4 sur papier épais, découpez chaque QR code et placez-le sur la
          table. Le lien encode l'adresse publique configurée dans <code>SITE_URL</code>.
        </p>
      </div>
    </div>
  );
}

function TableCard({
  table,
  origin,
  onChanged,
  onRemove,
}: {
  table: DiningTable;
  origin: string;
  onChanged: (message: string) => void;
  onRemove: () => void;
}) {
  const toast = useToast();
  const [number, setNumber] = useState(String(table.number));
  const [label, setLabel] = useState(table.label || "");
  const [saving, setSaving] = useState(false);
  const dirty = Number(number) !== table.number || label !== (table.label || "");

  async function save() {
    const parsed = Number(number);
    if (!Number.isInteger(parsed) || parsed < 1 || parsed > 999) {
      toast.show({ message: "Numéro de table invalide.", type: "error" });
      return;
    }
    setSaving(true);
    try {
      const response = await fetch(`/api/admin/tables/${table.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: parsed, label: label.trim() || `Table ${parsed}` }),
      });
      const data = await response.json();
      if (!response.ok) {
        toast.show({ message: data.error || "Modification impossible.", type: "error" });
        return;
      }
      onChanged("Table mise à jour.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive() {
    const response = await fetch(`/api/admin/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !table.active }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Modification impossible.", type: "error" });
      return;
    }
    onChanged(table.active ? "Table désactivée." : "Table activée.");
  }

  return (
    <article className={`rounded-2xl border border-black/5 bg-white p-3 shadow-card ${table.active ? "" : "opacity-65"}`}>
      <div className="flex items-start gap-3">
        <a
          href={`/api/admin/tables/${table.id}/qr?format=png&inline=1`}
          target="_blank"
          rel="noreferrer"
          className="group relative h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-stone-200 bg-white p-1"
          title="Ouvrir le QR code"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/admin/tables/${table.id}/qr?format=png&inline=1`}
            alt={`QR code de la table ${table.number}`}
            className="h-full w-full"
          />
          <span className="absolute inset-0 hidden items-center justify-center bg-white/80 text-[10px] font-extrabold text-forest group-hover:flex">
            <ExternalLink className="h-3.5 w-3.5" />
          </span>
        </a>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <h2 className="font-display text-base font-bold text-forest">
              Table {table.number}
            </h2>
            <button
              type="button"
              onClick={toggleActive}
              className={`rounded-full px-2 py-1 text-[10px] font-extrabold ${
                table.active ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-400"
              }`}
            >
              {table.active ? "Active" : "Désactivée"}
            </button>
          </div>
          <div className="mt-1.5 space-y-1">
            <input
              value={number}
              onChange={(event) => setNumber(event.target.value.replace(/\D/g, ""))}
              className="field h-8 px-2 py-1 text-xs font-bold"
              aria-label={`Numéro de la table ${table.number}`}
              inputMode="numeric"
            />
            <input
              value={label}
              onChange={(event) => setLabel(event.target.value.slice(0, 60))}
              placeholder={`Table ${table.number}`}
              className="field h-8 px-2 py-1 text-xs"
              aria-label={`Libellé de la table ${table.number}`}
            />
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            {dirty ? (
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="inline-flex items-center gap-1 rounded-lg bg-forest px-2 py-1 text-[10px] font-extrabold text-white"
              >
                {saving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
                Enregistrer
              </button>
            ) : null}
            <a
              href={`/api/admin/tables/${table.id}/qr?format=png`}
              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600 hover:bg-stone-200"
            >
              <Download className="h-3 w-3" />
              PNG
            </a>
            <a
              href={`/api/admin/tables/${table.id}/qr?format=svg`}
              className="inline-flex items-center gap-1 rounded-lg bg-stone-100 px-2 py-1 text-[10px] font-bold text-stone-600 hover:bg-stone-200"
            >
              <Download className="h-3 w-3" />
              SVG
            </a>
            <button
              type="button"
              onClick={onRemove}
              className="ml-auto rounded-lg p-1.5 text-stone-300 hover:bg-red-50 hover:text-red-600"
              aria-label={`Supprimer la table ${table.number}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="mt-1 truncate text-[9px] text-stone-400">
            {origin}/?table={table.number}
          </p>
        </div>
      </div>
    </article>
  );
}
