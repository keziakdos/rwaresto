import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60dvh] flex-col items-center justify-center px-4 text-center">
      <p className="font-display text-6xl font-bold text-brand">404</p>
      <h1 className="mt-2 font-display text-2xl font-bold text-forest">Page introuvable</h1>
      <p className="mt-2 max-w-sm text-sm text-ink/50">
        La page demandée n'existe pas ou a été déplacée.
      </p>
      <Link href="/" className="btn-primary mt-6">
        Retour à l'accueil
      </Link>
    </div>
  );
}
