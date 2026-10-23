import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin, ShoppingBag, UtensilsCrossed } from "lucide-react";
import { getPublicConfig } from "@/lib/settings";
import { ThemeToggle } from "./ui/theme-toggle";

export async function PublicHeader({ compact = false }: { compact?: boolean }) {
  const config = await getPublicConfig();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-line/60 glass">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between gap-3 px-4 sm:h-[4.5rem] sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3" aria-label="Accueil Rwaresto">
          <span className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-forest shadow-card ring-1 ring-white/20 sm:h-11 sm:w-11">
            {config.logoUrl ? (
              <Image src={config.logoUrl} alt="" width={44} height={44} className="h-full w-full object-cover" />
            ) : (
              <Image src="/logo.png" alt="" width={44} height={44} className="h-full w-full object-cover" priority />
            )}
          </span>
          <span className="min-w-0">
            <span className="block truncate font-display text-lg font-semibold leading-none text-ink sm:text-xl">
              {config.restaurantName}
            </span>
            <span className="mt-1 hidden items-center gap-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted sm:flex">
              <UtensilsCrossed className="h-3 w-3 text-brand" />
              Cuisine & épices
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2" aria-label="Navigation principale">
          {!compact ? (
            <>
              <Link href="/menu" className="hidden rounded-full px-4 py-2 text-sm font-bold text-muted transition hover:bg-ink/5 hover:text-ink md:inline-flex">
                La carte
              </Link>
              <Link href="/#etapes" className="hidden rounded-full px-4 py-2 text-sm font-bold text-muted transition hover:bg-ink/5 hover:text-ink lg:inline-flex">
                Comment ça marche
              </Link>
            </>
          ) : null}
          <span className="hidden items-center gap-1.5 rounded-full border border-line bg-surface px-3 py-1.5 text-[11px] font-bold text-muted sm:inline-flex">
            <MapPin className="h-3.5 w-3.5 text-brand" />
            {config.isOpen ? "Ouvert" : "Fermé"}
          </span>
          <ThemeToggle />
          <Link href="/menu" className="btn-forest min-h-10 px-4 text-xs">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Commander</span>
            <ArrowUpRight className="hidden h-3.5 w-3.5 sm:block" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
