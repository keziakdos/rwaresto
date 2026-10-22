import Image from "next/image";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import { getPublicConfig } from "@/lib/settings";

export async function PublicHeader({ compact = false }: { compact?: boolean }) {
  const config = await getPublicConfig();
  return (
    <header className="no-print sticky top-0 z-40 border-b border-black/5 glass">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex min-w-0 items-center gap-2.5" aria-label="Accueil Rwaresto">
          {config.logoUrl ? (
            <Image
              src={config.logoUrl}
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 rounded-2xl object-cover"
            />
          ) : (
            <Image
              src="/logo.png"
              alt=""
              width={44}
              height={44}
              className="h-10 w-10 rounded-2xl"
              priority
            />
          )}
          <span className="truncate font-display text-xl font-bold leading-none text-forest">
            {config.restaurantName}
          </span>
        </Link>
        <nav className="flex items-center gap-1">
          <Link href="/menu" className="btn-ghost min-h-10 px-3 text-forest">
            <ShoppingBag className="h-4 w-4" />
            <span className={compact ? "sr-only" : "hidden sm:inline"}>Le menu</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
