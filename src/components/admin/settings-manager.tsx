"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Camera,
  ExternalLink,
  Loader2,
  RotateCcw,
  Store,
  Upload,
} from "lucide-react";
import { useToast } from "../toast-provider";

type Settings = Record<string, string>;

const WEEKDAYS = [
  { value: "1", label: "Lun" },
  { value: "2", label: "Mar" },
  { value: "3", label: "Mer" },
  { value: "4", label: "Jeu" },
  { value: "5", label: "Ven" },
  { value: "6", label: "Sam" },
  { value: "0", label: "Dim" },
];

export function SettingsManager() {
  const toast = useToast();
  const router = useRouter();
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState("");
  const logoInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/settings", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setSettings(data.settings);
    } catch {
      setError("Impossible de charger les paramètres.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function set(key: string, value: string) {
    setSettings((current) => (current ? { ...current, [key]: value } : current));
  }

  function closedDayValues(): string[] {
    if (!settings?.closedDays) return [];
    return settings.closedDays
      .split(",")
      .map((day) => day.trim())
      .filter(Boolean);
  }

  function toggleClosedDay(value: string) {
    const current = new Set(closedDayValues());
    if (current.has(value)) current.delete(value);
    else current.add(value);
    set(
      "closedDays",
      [...current].sort((a, b) => Number(a) - Number(b)).join(","),
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setError("");
    try {
      let logoUrl = settings.logoUrl;
      if (logoFile) {
        const form = new FormData();
        form.append("file", logoFile);
        form.append("kind", "logo");
        const upload = await fetch("/api/admin/upload", { method: "POST", body: form });
        const uploadData = await upload.json();
        if (!upload.ok) {
          setError(uploadData.error || "Téléversement du logo impossible.");
          return;
        }
        logoUrl = uploadData.url;
      }
      const payload: Record<string, string> = { ...settings, logoUrl };
      const response = await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      setSettings(data.settings);
      setLogoFile(null);
      if (logoPreview) URL.revokeObjectURL(logoPreview);
      setLogoPreview("");
      toast.show({ message: "Paramètres enregistrés. Le site public est à jour.", type: "success" });
      router.refresh();
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setSaving(false);
    }
  }

  function chooseLogo(file: File | null) {
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      toast.show({ message: "Logo trop volumineux (8 Mo maximum).", type: "error" });
      return;
    }
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function cancel() {
    if (!window.confirm("Recharger les paramètres et annuler les modifications ?")) return;
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview("");
    load();
  }

  if (loading && !settings) {
    return (
      <div className="flex justify-center py-24 text-muted">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="rounded-2xl bg-surface p-8 text-center">
        <p className="text-sm font-bold text-muted">{error}</p>
        <button type="button" onClick={load} className="btn-primary mt-4">
          Réessayer
        </button>
      </div>
    );
  }

  const logo = logoPreview || settings.logoUrl;
  const closedDays = closedDayValues();
  const isManuallyOpen = settings.manualOpen !== "false";

  return (
    <div className="pb-32 lg:pb-24">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <Store className="h-3.5 w-3.5" />
            Configuration
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            Les réglages du restaurant.
          </h1>
          <p className="mt-1.5 text-sm text-muted">Identité, horaires et ouverture du restaurant.</p>
        </div>
        <Link href="/" target="_blank" className="btn-secondary min-h-11 px-3.5 text-xs">
          <ExternalLink className="h-4 w-4" />
          Voir le site
        </Link>
      </header>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <section className="rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card sm:p-5">
          <h2 className="font-display text-xl font-semibold text-ink">Identité</h2>
          <div className="mt-3 space-y-3">
            <div>
              <label htmlFor="restaurant-name" className="admin-label">
                Nom du restaurant
              </label>
              <input
                id="restaurant-name"
                value={settings.restaurantName}
                onChange={(event) => set("restaurantName", event.target.value.slice(0, 80))}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="restaurant-tagline" className="admin-label">
                Accroche
              </label>
              <input
                id="restaurant-tagline"
                value={settings.tagline}
                onChange={(event) => set("tagline", event.target.value.slice(0, 160))}
                className="field"
              />
            </div>
            <div>
              <label htmlFor="restaurant-welcome" className="admin-label">
                Message d'accueil
              </label>
              <textarea
                id="restaurant-welcome"
                value={settings.welcomeMessage}
                onChange={(event) => set("welcomeMessage", event.target.value.slice(0, 500))}
                rows={3}
                className="field resize-none"
              />
            </div>
            <div>
              <p className="admin-label">Logo</p>
              <div className="flex items-center gap-3">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-sand">
                  {logo ? (
                    <Image src={logo} alt="Logo" fill unoptimized className="object-cover" />
                  ) : (
                    <Image src="/logo.png" alt="" fill className="object-cover" />
                  )}
                </div>
                <div>
                  <input
                    ref={logoInput}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
                    capture="environment"
                    onChange={(event) => chooseLogo(event.target.files?.[0] || null)}
                    className="hidden"
                    id="logo-file"
                  />
                  <label htmlFor="logo-file" className="btn-secondary min-h-9 cursor-pointer px-3 text-xs">
                    <Camera className="h-3.5 w-3.5" />
                    Changer le logo
                  </label>
                  {settings.logoUrl ? (
                    <button
                      type="button"
                      onClick={() => {
                        set("logoUrl", "");
                        setLogoFile(null);
                        if (logoPreview) URL.revokeObjectURL(logoPreview);
                        setLogoPreview("");
                      }}
                      className="mt-1 block text-[10px] font-bold text-red-500 hover:underline"
                    >
                      Retirer le logo personnalisé
                    </button>
                  ) : null}
                  <p className="mt-1 text-[10px] text-muted">Carré, converti en WebP.</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="primary-color" className="admin-label">
                  Couleur principale
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.primaryColor}
                    onChange={(event) => set("primaryColor", event.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1"
                    aria-label="Couleur principale"
                  />
                  <input
                    id="primary-color"
                    value={settings.primaryColor}
                    onChange={(event) => set("primaryColor", event.target.value)}
                    className="field h-10 flex-1 text-xs"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="accent-color" className="admin-label">
                  Couleur secondaire
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={settings.accentColor}
                    onChange={(event) => set("accentColor", event.target.value)}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-line bg-surface p-1"
                    aria-label="Couleur secondaire"
                  />
                  <input
                    id="accent-color"
                    value={settings.accentColor}
                    onChange={(event) => set("accentColor", event.target.value)}
                    className="field h-10 flex-1 text-xs"
                  />
                </div>
              </div>
            </div>
            <div>
              <label htmlFor="currency" className="admin-label">
                Devise (code ISO)
              </label>
              <input
                id="currency"
                value={settings.currency}
                onChange={(event) => set("currency", event.target.value.toUpperCase().slice(0, 3))}
                className="field w-28 uppercase"
                maxLength={3}
              />
              <p className="mt-1 text-[10px] text-muted">EUR, USD, XOF, MAD…</p>
            </div>
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card sm:p-5">
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-semibold text-ink">Ouverture</h2>
              <span
                className={`badge ${isManuallyOpen ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"}`}
              >
                {isManuallyOpen ? "Ouvert manuellement" : "Fermé manuellement"}
              </span>
            </div>
            <label className="mt-3 flex cursor-pointer items-center justify-between rounded-xl border border-line p-3">
              <span>
                <span className="flex items-center gap-1.5 text-sm font-extrabold text-ink">
                  <Store className="h-4 w-4 text-forest" />
                  Accepter les commandes
                </span>
                <span className="text-[10px] text-muted">
                  Désactivez pour fermer immédiatement les commandes.
                </span>
              </span>
              <input
                type="checkbox"
                checked={isManuallyOpen}
                onChange={(event) => set("manualOpen", event.target.checked ? "true" : "false")}
                className="h-5 w-5 accent-[var(--color-brand)]"
              />
            </label>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="open-time" className="admin-label">
                  Ouverture
                </label>
                <input
                  id="open-time"
                  type="time"
                  value={settings.openTime}
                  onChange={(event) => set("openTime", event.target.value)}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="close-time" className="admin-label">
                  Fermeture
                </label>
                <input
                  id="close-time"
                  type="time"
                  value={settings.closeTime}
                  onChange={(event) => set("closeTime", event.target.value)}
                  className="field"
                />
              </div>
            </div>
            <div className="mt-3">
              <p className="admin-label">Jours de fermeture</p>
              <div className="flex flex-wrap gap-1">
                {WEEKDAYS.map((day) => (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleClosedDay(day.value)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-extrabold ${
                      closedDays.includes(day.value)
                        ? "border-red-200 bg-red-50 text-red-700"
                        : "border-line text-muted"
                    }`}
                    aria-pressed={closedDays.includes(day.value)}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-[10px] text-muted">Aucun jour sélectionné = ouvert tous les jours.</p>
            </div>
            <div className="mt-3">
              <label htmlFor="hours-text" className="admin-label">
                Horaires affichés
              </label>
              <input
                id="hours-text"
                value={settings.hoursText}
                onChange={(event) => set("hoursText", event.target.value.slice(0, 200))}
                className="field"
                placeholder="Tous les jours · 11h00 – 22h00"
              />
            </div>
          </section>

          <section className="rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card sm:p-5">
            <h2 className="font-display text-xl font-semibold text-ink">Coordonnées</h2>
            <div className="mt-3 space-y-3">
              <div>
                <label htmlFor="address" className="admin-label">
                  Adresse
                </label>
                <input
                  id="address"
                  value={settings.address}
                  onChange={(event) => set("address", event.target.value.slice(0, 200))}
                  className="field"
                />
              </div>
              <div>
                <label htmlFor="phone" className="admin-label">
                  Téléphone
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={settings.phone}
                  onChange={(event) => set("phone", event.target.value.slice(0, 30))}
                  className="field"
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
          {error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-[4.6rem] z-20 border-t border-line/70 bg-surface/95 px-4 py-3 backdrop-blur-xl lg:bottom-0 lg:left-72">
        <div className="mx-auto flex max-w-7xl items-center justify-end gap-2">
          <button type="button" onClick={cancel} disabled={saving} className="btn-secondary">
            <RotateCcw className="h-4 w-4" />
            Annuler
          </button>
          <button type="button" onClick={save} disabled={saving} className="btn-primary min-w-36">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {saving ? "Enregistrement…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
