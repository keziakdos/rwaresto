"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { KeyRound, LogOut, ShieldAlert } from "lucide-react";
import type { SessionUser } from "@/lib/auth";

export function ChangePasswordForm({ user }: { user: SessionUser }) {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    if (newPassword !== confirm) {
      setError("Les deux nouveaux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Impossible de changer le mot de passe.");
        return;
      }
      router.push(user.role === "admin" ? "/admin" : "/admin/orders");
      router.refresh();
    } catch {
      setError("Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-4 flex flex-col items-center text-center">
          <Image src="/logo.png" alt="" width={64} height={64} className="h-16 w-16 rounded-2xl" />
          <h1 className="mt-3 font-display text-2xl font-bold text-forest">Nouveau mot de passe</h1>
          <p className="mt-1 text-sm text-stone-500">
            Bonjour {user.displayName}, choisissez un mot de passe personnel pour continuer.
          </p>
        </div>
        <div className="rounded-3xl border border-black/5 bg-white p-5 shadow-card">
          {user.mustChangePassword ? (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-xs font-semibold text-amber-800">
              <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
              Votre mot de passe a été créé ou réinitialisé par un administrateur. Il doit être
              changé à la première connexion.
            </div>
          ) : null}
          <form onSubmit={submit} className="space-y-3">
            <div>
              <label htmlFor="current-password" className="admin-label">
                Mot de passe actuel
              </label>
              <input
                id="current-password"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                className="field"
                required
              />
            </div>
            <div>
              <label htmlFor="new-password" className="admin-label">
                Nouveau mot de passe
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                className="field"
                minLength={8}
                required
              />
              <p className="mt-1 text-[11px] text-stone-400">
                8 caractères minimum, avec au moins une lettre et un chiffre.
              </p>
            </div>
            <div>
              <label htmlFor="confirm-password" className="admin-label">
                Confirmer
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                className="field"
                required
              />
            </div>
            {error ? (
              <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={loading} className="btn-primary min-h-12 w-full">
              <KeyRound className="h-4 w-4" />
              {loading ? "Enregistrement…" : "Enregistrer mon mot de passe"}
            </button>
            <button type="button" onClick={logout} className="btn-ghost w-full text-xs">
              <LogOut className="h-3.5 w-3.5" />
              Se déconnecter
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
