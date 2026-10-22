import Link from "next/link";
import { getPublicConfig } from "@/lib/settings";

export async function PublicFooter() {
  const config = await getPublicConfig();
  return (
    <footer className="no-print mt-14 border-t border-black/5 px-4 py-8 text-center text-sm text-ink/55">
      <p className="font-display text-lg font-semibold text-forest">{config.restaurantName}</p>
      <p className="mt-1">{config.hoursText}</p>
      {config.address ? <p className="mt-1">{config.address}</p> : null}
      <div className="mt-4 flex justify-center gap-4 text-xs">
        <Link href="/menu" className="underline-offset-4 hover:underline">
          Le menu
        </Link>
        <Link href="/admin/login" className="underline-offset-4 hover:underline">
          Espace équipe
        </Link>
      </div>
    </footer>
  );
}
