"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserX,
  X,
} from "lucide-react";
import { ROLE_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/format";
import { useToast } from "../toast-provider";

type TeamUser = {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "cashier";
  active: boolean;
  mustChangePassword: boolean;
  createdAt: string;
};

export function UsersManager({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [users, setUsers] = useState<TeamUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<TeamUser | null | "new">(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/users", { cache: "no-store" });
      const data = await response.json();
      if (response.ok) setUsers(data.users || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(user: TeamUser) {
    const response = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !user.active }),
    });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Modification impossible.", type: "error" });
      return;
    }
    toast.show({ message: user.active ? "Compte désactivé." : "Compte réactivé.", type: "success" });
    load();
  }

  async function remove(user: TeamUser) {
    if (!window.confirm(`Supprimer définitivement le compte « ${user.displayName} » ?`)) return;
    const response = await fetch(`/api/admin/users/${user.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      toast.show({ message: data.error || "Suppression impossible.", type: "error" });
      return;
    }
    toast.show({ message: "Compte supprimé.", type: "success" });
    load();
  }

  return (
    <div>
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow flex items-center gap-2">
            <span className="status-dot text-brand" />
            Accès
          </p>
          <h1 className="mt-2 font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl">
            L&apos;équipe et les accès.
          </h1>
          <p className="mt-1.5 text-sm text-muted">
            Admin : accès complet. Caisse : commandes et encaissement uniquement.
          </p>
        </div>
        <button type="button" onClick={() => setEditing("new")} className="btn-primary min-h-11 px-4 text-xs">
          <Plus className="h-4 w-4" />
          Ajouter un utilisateur
        </button>
      </header>

      <div className="mt-5 rounded-[1.4rem] border border-sky-200/70 bg-sky-50 p-4 text-xs leading-relaxed text-sky-900">
        <strong className="font-extrabold">Sécurité :</strong> un mot de passe temporaire doit être
        changé à la première connexion. Les comptes désactivés sont déconnectés immédiatement. Le
        dernier administrateur actif ne peut être ni supprimé, ni rétrogradé.
      </div>

      {loading ? (
        <div className="flex justify-center py-16 text-muted">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-[1.4rem] border border-line/70 bg-surface shadow-card">
          <div className="hidden grid-cols-[1.4fr_1fr_0.8fr_0.8fr_130px] gap-2 border-b border-line/60 bg-cream/50 px-4 py-2 text-[10px] font-extrabold uppercase tracking-wide text-muted md:grid">
            <span>Utilisateur</span>
            <span>Identifiant</span>
            <span>Rôle</span>
            <span>Statut</span>
            <span className="text-right">Actions</span>
          </div>
          <div className="divide-y divide-line/60">
            {users.map((user) => (
              <div key={user.id} className="grid gap-2 px-4 py-3 md:grid-cols-[1.4fr_1fr_0.8fr_0.8fr_130px] md:items-center">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-soft text-xs font-extrabold text-brand-dark">
                    {user.displayName.slice(0, 1).toUpperCase()}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-extrabold text-ink">
                      {user.displayName}
                      {user.id === currentUserId ? (
                        <span className="ml-1.5 rounded-full bg-sand px-1.5 py-0.5 text-[9px] font-bold text-muted">vous</span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-muted">Créé le {formatDateTime(user.createdAt)}</p>
                  </div>
                </div>
                <p className="text-xs font-bold text-muted">@{user.username}</p>
                <div>
                  <span className={`badge ${user.role === "admin" ? "bg-forest/10 text-forest" : "bg-sky-50 text-sky-700"}`}>
                    {user.role === "admin" ? <ShieldCheck className="mr-1 h-3 w-3" /> : null}
                    {ROLE_LABELS[user.role]}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  <span className={`badge ${user.active ? "bg-emerald-50 text-emerald-700" : "bg-sand text-muted"}`}>
                    {user.active ? "Actif" : "Désactivé"}
                  </span>
                  {user.mustChangePassword ? (
                    <span className="badge bg-amber-50 text-amber-700">Mdp à changer</span>
                  ) : null}
                </div>
                <div className="flex items-center gap-0.5 md:justify-end">
                  <button
                    type="button"
                    onClick={() => setEditing(user)}
                    className="rounded-lg p-2 text-muted hover:bg-sand hover:text-forest"
                    aria-label={`Modifier ${user.displayName}`}
                    title="Modifier / réinitialiser le mot de passe"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(user)}
                    disabled={user.id === currentUserId}
                    className={`rounded-lg p-2 hover:bg-sand disabled:opacity-25 ${
                      user.active ? "text-amber-500" : "text-emerald-600"
                    }`}
                    aria-label={user.active ? "Désactiver" : "Activer"}
                    title={user.active ? "Désactiver" : "Activer"}
                  >
                    {user.active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(user)}
                    disabled={user.id === currentUserId}
                    className="rounded-lg p-2 text-muted/40 hover:bg-red-50 hover:text-red-600 disabled:opacity-25"
                    aria-label={`Supprimer ${user.displayName}`}
                    title="Supprimer"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {editing ? (
        <UserEditor
          user={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={(message) => {
            setEditing(null);
            toast.show({ message, type: "success" });
            load();
          }}
        />
      ) : null}
    </div>
  );
}

function UserEditor({
  user,
  onClose,
  onSaved,
}: {
  user: TeamUser | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const [username, setUsername] = useState(user?.username || "");
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [role, setRole] = useState<"admin" | "cashier">(user?.role || "cashier");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (!displayName.trim()) {
      setError("Nom affiché requis.");
      return;
    }
    if (!user && !username.trim()) {
      setError("Identifiant requis.");
      return;
    }
    if (!user && password.length < 8) {
      setError("Le mot de passe temporaire doit contenir au moins 8 caractères.");
      return;
    }
    if (password && password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        displayName: displayName.trim(),
        role,
      };
      if (!user) {
        payload.username = username.trim();
        payload.password = password;
      } else if (password) {
        payload.password = password;
      }
      const response = await fetch(user ? `/api/admin/users/${user.id}` : "/api/admin/users", {
        method: user ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Enregistrement impossible.");
        return;
      }
      onSaved(
        user
          ? password
            ? "Utilisateur mis à jour et mot de passe réinitialisé."
            : "Utilisateur mis à jour."
          : "Utilisateur créé. Il devra changer son mot de passe.",
      );
    } catch {
      setError("Une erreur réseau est survenue.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4" role="dialog" aria-modal="true">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-[#1a120c]/55" aria-label="Fermer" />
      <form
        onSubmit={submit}
        className="relative w-full max-w-md rounded-t-3xl bg-surface p-5 shadow-soft animate-slide-up sm:rounded-3xl"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-forest">
              {user ? "Modifier l'utilisateur" : "Nouvel utilisateur"}
            </h2>
            <p className="text-xs text-muted">
              {user ? "Réinitialisez le mot de passe si nécessaire." : "Un mot de passe temporaire sera demandé."}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-muted hover:bg-sand" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {!user ? (
            <div>
              <label htmlFor="user-username" className="admin-label">
                Identifiant *
              </label>
              <input
                id="user-username"
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ""))}
                className="field"
                placeholder="ex. caisse1"
                required
              />
            </div>
          ) : (
            <p className="rounded-xl bg-cream/50 px-3 py-2 text-xs font-bold text-muted">
              Identifiant : @{user.username}
            </p>
          )}
          <div>
            <label htmlFor="user-display-name" className="admin-label">
              Nom affiché *
            </label>
            <input
              id="user-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value.slice(0, 60))}
              className="field"
              placeholder="ex. Awa — caisse"
              required
            />
          </div>
          <div>
            <label htmlFor="user-role" className="admin-label">
              Rôle
            </label>
            <select
              id="user-role"
              value={role}
              onChange={(event) => setRole(event.target.value as "admin" | "cashier")}
              className="field"
            >
              <option value="cashier">Caisse — commandes uniquement</option>
              <option value="admin">Administrateur — accès complet</option>
            </select>
          </div>
          <div>
            <label htmlFor="user-password" className="admin-label">
              {user ? "Réinitialiser le mot de passe" : "Mot de passe temporaire *"}
            </label>
            <div className="relative">
              <input
                id="user-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="field pr-11"
                placeholder={user ? "Laisser vide pour ne pas changer" : "8 caractères min."}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-sand"
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {user ? (
              <p className="mt-1 flex items-center gap-1 text-[10px] text-muted">
                <KeyRound className="h-3 w-3" />
                Le compte devra choisir un nouveau mot de passe à la prochaine connexion.
              </p>
            ) : null}
          </div>
          {error ? (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
              {error}
            </p>
          ) : null}
        </div>

        <div className="mt-5 flex gap-2">
          <button type="button" onClick={onClose} disabled={saving} className="btn-secondary flex-1">
            Annuler
          </button>
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Enregistrer
          </button>
        </div>
      </form>
    </div>
  );
}
