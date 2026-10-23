import Link from "next/link";
import { ArrowUpRight, Clock3, MapPin, UtensilsCrossed } from "lucide-react";
import { getPublicConfig } from "@/lib/settings";

export async function PublicFooter() {
  const config = await getPublicConfig();
  return (
    <footer className="no-print mt-20 px-3 sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] bg-[#12352a] text-[#fbf5ea] shadow-lift dark:bg-[#0d281f]">
        <div className="relative px-6 py-10 sm:px-10 sm:py-12">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-1/3 h-64 w-64 rounded-full bg-gold/10 blur-3xl" />
          <div className="relative grid gap-10 md:grid-cols-[1.4fr_1fr_1fr]">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <UtensilsCrossed className="h-5 w-5 text-[#f0b27a]" />
                </span>
                <p className="font-display text-2xl font-semibold">{config.restaurantName}</p>
              </div>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-white/65">{config.tagline}</p>
              <Link href="/menu" className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#f0b27a] px-5 py-3 text-sm font-extrabold text-[#2a1a12] transition hover:-translate-y-0.5 hover:bg-[#f7c795]">
                Découvrir la carte
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-4 text-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40">Nous trouver</p>
              <p className="flex items-start gap-2.5 text-white/75">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#f0b27a]" />
                {config.address || "Adresse à renseigner"}
              </p>
              <p className="flex items-start gap-2.5 text-white/75">
                <Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#f0b27a]" />
                {config.hoursText}
              </p>
            </div>
            <div className="space-y-3 text-sm">
              <p className="text-[10px] font-extrabold uppercase tracking-[0.2em] text-white/40">Accès rapide</p>
              <Link href="/menu" className="block text-white/75 transition hover:text-white">La carte</Link>
              <Link href="/#etapes" className="block text-white/75 transition hover:text-white">Comment commander</Link>
              <Link href="/admin/login" className="block text-white/75 transition hover:text-white">Espace équipe</Link>
            </div>
          </div>
          <div className="relative mt-10 flex flex-col gap-3 border-t border-white/10 pt-5 text-[11px] font-medium text-white/40 sm:flex-row sm:items-center sm:justify-between">
            <p>© {new Date().getFullYear()} {config.restaurantName}. Commande à table, sans paiement en ligne.</p>
            <p className="flex items-center gap-3">
              <span className={`inline-flex items-center gap-1.5 ${config.isOpen ? "text-emerald-300" : "text-red-300"}`}>
                <span className="status-dot" />
                {config.isOpen ? "Commandes ouvertes" : "Commandes fermées"}
              </span>
              <span className="text-white/20">·</span>
              <span>Fait avec soin</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
