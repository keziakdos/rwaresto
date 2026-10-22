"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogIn } from "lucide-react";
import { useSite } from "../site-provider";

export function LoginForm() {
  const site = useSite();
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.error || "Connexion impossible.");
        return;
      }
      if (data.user.mustChangePassword) router.push("/admin/change-password");
      else router.push(data.user.role === "admin" ? "/admin" : "/admin/orders");
      router.refresh();
    } catch {
      setError("Connexion impossible. Réessayez.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-[radial-gradient(circle_at_top_left,_#f7e2d5,_transparent_50%),radial-gradient(circle_at_bottom_right,_#dfeae3,_transparent_55%)] px-4 py-10">
      <div className="w-full max-w-md">
        <Link href="/" className="mb-5 inline-flex items-center gap-1.5 text-sm font-bold text-stone-500 hover:text-brand">
          <ArrowLeft className="h-4 w-4" />
          Site public
        </Link>
        <div className="overflow-hidden rounded-[2rem] border border-white bg-white/90 shadow-soft backdrop-blur">
          <div className="bg-forest px-6 py-7 text-white">
            <div className="flex items-center gap-3">
              {site.logoUrl ? (
                <Image
                  src={site.logoUrl}
                  alt=""
                  width={52}
                  height={52}
                  className="h-13 w-13 rounded-2xl object-cover"
                />
              ) : (
                <Image src="/logo.png" alt="" width={52} height={52} className="h-13 w-13 rounded-2xl" />
              )}
              <div>
                <p className="font-display text-2xl font-bold leading-none">{site.restaurantName}</p>
                <p className="mt-1 text-xs font-bold uppercase tracking-widest text-white/50">
                  Espace équipe
                </p>
              </div>
            </div>
            <p className="mt-5 text-sm text-white/70">
              Connexion réservée à l'administration et à la caisse.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-4 px-6 py-6">
            <div>
              <label htmlFor="username" className="label">
                Identifiant
              </label>
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="field"
                placeholder="Votre identifiant"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="label">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field pr-12"
                  placeholder="Votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-stone-400 hover:bg-stone-100"
                  aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? (
              <p role="alert" className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-800">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={loading} className="btn-primary min-h-12 w-full text-base">
              <LogIn className="h-5 w-5" />
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-stone-400">
              Mot de passe oublié ? Demandez à un administrateur de le réinitialiser.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
