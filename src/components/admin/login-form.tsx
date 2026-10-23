"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Eye, EyeOff, LockKeyhole, LogIn, ShieldCheck, Sparkles } from "lucide-react";
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
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-cream px-4 py-10">
      <div className="pointer-events-none absolute -left-32 -top-32 h-96 w-96 rounded-full bg-brand/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-forest/10 blur-3xl" />

      <div className="relative grid w-full max-w-4xl overflow-hidden rounded-[2rem] border border-line/70 bg-surface shadow-lift lg:grid-cols-[.9fr_1.1fr]">
        <div className="relative hidden overflow-hidden bg-[#12352a] p-8 text-white dark:bg-[#0d281f] lg:flex lg:flex-col lg:justify-between">
          <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full border-[38px] border-white/[0.05]" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.18em] text-white/55">
              <ShieldCheck className="h-3.5 w-3.5 text-[#f0b27a]" />
              Espace sécurisé
            </span>
            <h1 className="mt-8 max-w-xs font-display text-4xl font-semibold leading-[1.05]">
              Le service, côté coulisses.
            </h1>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
              Commandes en direct, encaissement, menu et QR codes : tout ce qu&apos;il faut pour faire tourner la salle.
            </p>
          </div>
          <div className="relative space-y-3">
            {["Commandes et paiements en temps réel", "Menu et disponibilités instantanés", "Accès admin et caisse séparés"].map((item) => (
              <p key={item} className="flex items-center gap-2.5 text-xs font-semibold text-white/65">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/10">
                  <Sparkles className="h-3 w-3 text-[#f0b27a]" />
                </span>
                {item}
              </p>
            ))}
          </div>
        </div>

        <div className="p-5 sm:p-8">
          <Link href="/" className="inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-bold text-muted transition hover:text-brand">
            <ArrowLeft className="h-4 w-4" />
            Site public
          </Link>

          <div className="mt-6 flex items-center gap-3 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-forest">
              <Image src={site.logoUrl || "/logo.png"} alt="" width={44} height={44} className="h-full w-full object-cover" />
            </span>
            <div>
              <p className="font-display text-xl font-semibold leading-none text-ink">{site.restaurantName}</p>
              <p className="mt-1 text-[9px] font-extrabold uppercase tracking-[0.16em] text-muted">Espace équipe</p>
            </div>
          </div>

          <div className="mt-7">
            <p className="eyebrow">Connexion</p>
            <h2 className="mt-2 font-display text-3xl font-semibold text-ink">Bon retour parmi nous.</h2>
            <p className="mt-1.5 text-sm text-muted">Identifiez-vous pour accéder à la caisse et à l&apos;administration.</p>
          </div>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="username" className="label">Identifiant</label>
              <input
                id="username"
                autoComplete="username"
                autoCapitalize="none"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="field h-12"
                placeholder="Votre identifiant"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="label">Mot de passe</label>
              <div className="relative">
                <input
                  id="password"
                  type={visible ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className="field h-12 pr-12"
                  placeholder="Votre mot de passe"
                  required
                />
                <button
                  type="button"
                  onClick={() => setVisible((value) => !value)}
                  className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-muted transition hover:bg-sand"
                  aria-label={visible ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            {error ? (
              <p role="alert" className="flex items-start gap-2 rounded-2xl bg-red-50 p-3 text-sm font-bold text-red-800">
                <LockKeyhole className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </p>
            ) : null}
            <button type="submit" disabled={loading} className="btn-primary min-h-13 w-full text-base">
              <LogIn className="h-5 w-5" />
              {loading ? "Connexion…" : "Se connecter"}
            </button>
            <p className="text-center text-[11px] leading-relaxed text-muted">
              Mot de passe oublié ? Demandez à un administrateur de le réinitialiser.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
