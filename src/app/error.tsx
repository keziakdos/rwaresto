"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <h1 className="font-display text-2xl font-bold text-forest">Une erreur est survenue</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/50">
        Réessayez ou revenez à l'accueil. Si le problème persiste, contactez l'équipe.
      </p>
      <div className="mt-6 flex gap-2">
        <button type="button" onClick={reset} className="btn-primary">
          Réessayer
        </button>
        <Link href="/" className="btn-secondary">
          Accueil
        </Link>
      </div>
    </div>
  );
}
