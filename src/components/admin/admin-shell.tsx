"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BarChart3,
  ClipboardList,
  KeyRound,
  LayoutDashboard,
  LogOut,
  QrCode,
  Settings,
  UtensilsCrossed,
  Users,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { useSite } from "../site-provider";
import { ThemeToggle } from "../ui/theme-toggle";

const SHORT_LABELS: Record<string, string> = {
  "/admin/orders": "Commandes",
  "/admin": "Tableau",
  "/admin/stats": "Stats",
  "/admin/menu": "Menu",
  "/admin/tables": "Tables",
  "/admin/users": "Équipe",
  "/admin/settings": "Réglages",
};

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const site = useSite();
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/admin/orders", label: "Commandes", icon: ClipboardList, roles: ["admin", "cashier"] },
    { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard, roles: ["admin"] },
    { href: "/admin/stats", label: "Statistiques", icon: BarChart3, roles: ["admin"] },
    { href: "/admin/menu", label: "Menu", icon: UtensilsCrossed, roles: ["admin"] },
    { href: "/admin/tables", label: "Tables & QR", icon: QrCode, roles: ["admin"] },
    { href: "/admin/users", label: "Utilisateurs", icon: Users, roles: ["admin"] },
    { href: "/admin/settings", label: "Paramètres", icon: Settings, roles: ["admin"] },
  ].filter((link) => link.roles.includes(user.role));

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname.startsWith(href);
  }

  return (
    <div className="min-h-dvh bg-cream lg:grid lg:grid-cols-[18rem_1fr]">
      <aside className="no-print sticky top-0 hidden h-dvh flex-col overflow-hidden bg-[#12352a] text-white dark:bg-[#0d281f] lg:flex">
        <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full border-[38px] border-white/[0.04]" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />

        <div className="relative flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-white/10 ring-1 ring-white/15">
            <Image src={site.logoUrl || "/logo.png"} alt="" width={44} height={44} className="h-full w-full object-cover" />
          </span>
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold leading-none">{site.restaurantName}</p>
            <p className="mt-1 flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.18em] text-white/40">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              Espace équipe
            </p>
          </div>
        </div>

        <nav className="relative flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="Navigation administration">
          <p className="mb-2 px-3 text-[9px] font-extrabold uppercase tracking-[0.2em] text-white/25">Pilotage</p>
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`admin-nav-item ${isActive(link.href) ? "admin-nav-item-active" : ""}`}
            >
              <link.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1">{link.label}</span>
              {isActive(link.href) ? <span className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
            </Link>
          ))}
        </nav>

        <div className="relative border-t border-white/10 p-3">
          <div className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/5">
            <p className="flex items-center gap-1.5 text-[9px] font-extrabold uppercase tracking-[0.16em] text-white/35">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              {site.isOpen ? "Service ouvert" : "Service fermé"}
            </p>
            <p className="mt-1 truncate text-xs font-bold text-white/80">{site.hoursText}</p>
          </div>

          <div className="mt-2 flex items-center gap-2.5 rounded-2xl p-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#f0b27a] text-xs font-extrabold text-[#2a1a12]">
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-white">{user.displayName}</p>
              <p className="text-[9px] font-bold uppercase tracking-[0.12em] text-white/35">
                {user.role === "admin" ? "Administrateur" : "Caisse"}
              </p>
            </div>
            <ThemeToggle className="border-white/10 bg-white/5 text-white/55 hover:text-white dark:border-white/10 dark:bg-white/5" />
            <button
              type="button"
              onClick={logout}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/55 transition hover:bg-white/10 hover:text-red-300"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>

          <Link
            href="/admin/change-password"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-[10px] font-bold text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <KeyRound className="h-3.5 w-3.5" />
            Changer mon mot de passe
          </Link>

          <Link
            href="/"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-white/10 py-2.5 text-[10px] font-bold text-white/50 transition hover:bg-white/5 hover:text-white"
          >
            <ArrowUpRight className="h-3.5 w-3.5" />
            Voir le site public
          </Link>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="no-print sticky top-0 z-30 border-b border-line/70 bg-cream/85 backdrop-blur-xl lg:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-3">
            <Link href="/admin" className="flex min-w-0 items-center gap-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-forest">
                <Image src={site.logoUrl || "/logo.png"} alt="" width={36} height={36} className="h-full w-full object-cover" />
              </span>
              <span className="min-w-0">
                <span className="block truncate font-display text-base font-semibold leading-none text-ink">{site.restaurantName}</span>
                <span className="mt-0.5 block text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted">Espace équipe</span>
              </span>
            </Link>
            <div className="flex items-center gap-1">
              <span className="hidden rounded-full bg-surface px-2.5 py-1 text-[10px] font-extrabold text-muted shadow-sm sm:inline-flex">
                {user.displayName}
              </span>
              <ThemeToggle />
              <Link
                href="/admin/change-password"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-forest"
                aria-label="Changer mon mot de passe"
                title="Changer mon mot de passe"
              >
                <KeyRound className="h-4 w-4" />
              </Link>
              <button
                type="button"
                onClick={logout}
                className="flex h-10 w-10 items-center justify-center rounded-full border border-line bg-surface text-muted transition hover:text-red-600"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-3 pb-24 pt-4 sm:px-5 sm:pt-6 lg:px-8 lg:pb-8 lg:pt-8">{children}</main>

        <nav
          className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-surface/95 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl lg:hidden"
          aria-label="Navigation mobile"
        >
          <div className="mx-auto flex max-w-lg items-stretch justify-around px-1">
            {links.map((link) => {
              const active = isActive(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex flex-1 flex-col items-center gap-1 rounded-xl px-0.5 py-1.5 text-[8px] font-extrabold transition ${
                    active ? "text-forest" : "text-muted/70"
                  }`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? "bg-forest text-white shadow-card" : ""}`}>
                    <link.icon className="h-[17px] w-[17px]" />
                  </span>
                  <span className="truncate">{SHORT_LABELS[link.href] || link.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
