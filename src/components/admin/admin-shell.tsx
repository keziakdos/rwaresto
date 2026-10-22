"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Store,
  QrCode,
  Settings,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import type { SessionUser } from "@/lib/auth";
import { useSite } from "../site-provider";

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
    <div className="min-h-dvh lg:flex">
      <aside className="no-print hidden w-64 shrink-0 flex-col border-r border-black/5 bg-white lg:flex">
        <div className="flex items-center gap-2.5 border-b border-black/5 px-5 py-4">
          <Image src="/logo.png" alt="" width={40} height={40} className="h-10 w-10 rounded-xl" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-bold leading-none text-forest">
              {site.restaurantName}
            </p>
            <p className="mt-0.5 text-[10px] font-extrabold uppercase tracking-widest text-stone-400">
              Espace équipe
            </p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition ${
                isActive(link.href)
                  ? "bg-forest text-white shadow-card"
                  : "text-stone-500 hover:bg-stone-100 hover:text-stone-800"
              }`}
            >
              <link.icon className="h-4 w-4" />
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="border-t border-black/5 p-3">
          <div className="flex items-center gap-2.5 rounded-xl bg-stone-50 px-3 py-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-xs font-extrabold text-brand-dark">
              {user.displayName.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold text-stone-800">{user.displayName}</p>
              <p className="text-[10px] font-bold uppercase tracking-wide text-stone-400">
                {user.role === "admin" ? "Administrateur" : "Caisse"}
              </p>
            </div>
            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-1.5 text-stone-400 hover:bg-white hover:text-red-600"
              aria-label="Se déconnecter"
              title="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
          <Link
            href="/"
            className="mt-2 flex items-center justify-center gap-1.5 rounded-lg py-2 text-[11px] font-bold text-stone-400 hover:text-brand"
          >
            <Store className="h-3.5 w-3.5" />
            Voir le site public
          </Link>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="no-print sticky top-0 z-30 border-b border-black/5 bg-white/90 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between gap-2 px-4 py-2.5">
            <Link href="/admin" className="flex items-center gap-2">
              <Image src="/logo.png" alt="" width={32} height={32} className="h-8 w-8 rounded-lg" />
              <span className="font-display text-base font-bold text-forest">Espace équipe</span>
            </Link>
            <div className="flex items-center gap-1">
              <span className="rounded-full bg-stone-100 px-2.5 py-1 text-[10px] font-extrabold text-stone-500">
                {user.displayName}
              </span>
              <button
                type="button"
                onClick={logout}
                className="rounded-lg p-2 text-stone-400 hover:text-red-600"
                aria-label="Se déconnecter"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
          <nav className="no-scrollbar flex gap-1 overflow-x-auto px-3 pb-2">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-extrabold ${
                  isActive(link.href)
                    ? "bg-forest text-white"
                    : "bg-stone-100 text-stone-500"
                }`}
              >
                <link.icon className="h-3.5 w-3.5" />
                {link.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className="mx-auto w-full max-w-7xl p-3 sm:p-5 lg:p-7">{children}</main>
      </div>
    </div>
  );
}
