import Link from "next/link";
import { ArrowLeft, Cookie, Database, LockKeyhole, ShieldCheck } from "lucide-react";
import { getPublicConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Confidentialité & RGPD",
  description: "Informations sur les données personnelles traitées par Rwaresto.",
};

const sections = [
  {
    title: "Responsable du traitement",
    body: (name: string, address: string, phone: string) =>
      `${name}, ${address || "adresse à compléter"}${phone ? ` · ${phone}` : ""}, est responsable des données personnelles collectées sur ce site et dans le cadre du service de commande à table.`,
  },
  {
    title: "Données collectées",
    body: () =>
      "Lors d'une commande : prénom ou pseudo, numéro de table, mode de service, contenu du panier, notes et préférences, numéro de téléphone si vous le renseignez, statut de préparation et mode de paiement constaté à la caisse. Des données techniques limitées (adresse IP, horodatage) peuvent être utilisées pour la sécurité et la limitation des abus.",
  },
  {
    title: "Finalités et bases légales",
    body: () =>
      "Les données servent à prendre en charge votre commande, la transmettre en cuisine, permettre le suivi et l'encaissement, assurer la sécurité du service et répondre à nos obligations. Ces traitements reposent sur l'exécution du service demandé, notre intérêt légitime à sécuriser le site et, le cas échéant, le respect d'obligations légales.",
  },
  {
    title: "Cookies et stockage local",
    body: () =>
      "Le site public ne dépose pas de cookie publicitaire ni de traceur tiers. Votre thème, votre panier, votre prénom et vos commandes récentes sont conservés dans le stockage local de votre navigateur pour faciliter votre expérience. Le cookie de session est réservé à l'espace équipe et permet de maintenir la connexion des utilisateurs autorisés.",
  },
  {
    title: "Durées de conservation",
    body: () =>
      "Les données de commande sont conservées le temps nécessaire à la gestion du service et de la relation client. Les données utiles à la comptabilité ou à la preuve des transactions peuvent être conservées plus longtemps conformément aux obligations applicables. Les données stockées localement dans votre navigateur peuvent être supprimées à tout moment depuis les réglages de votre navigateur.",
  },
  {
    title: "Destinataires",
    body: () =>
      "Les données sont accessibles aux personnes habilitées de l'établissement (caisse et administration) et, le cas échéant, à nos prestataires techniques strictement nécessaires à l'hébergement et au fonctionnement du service. Elles ne sont ni vendues ni cédées à des fins commerciales.",
  },
  {
    title: "Vos droits",
    body: () =>
      "Vous disposez d'un droit d'accès, de rectification, d'effacement, de limitation, d'opposition et de portabilité de vos données. Pour exercer ces droits, contactez l'établissement aux coordonnées ci-dessus en précisant votre demande. Vous pouvez également introduire une réclamation auprès de la CNIL.",
  },
  {
    title: "Sécurité",
    body: () =>
      "Le site est servi en HTTPS. L'accès à l'administration est protégé par une authentification et des sessions signées. Les données de commande sont stockées dans une base dédiée à l'établissement et les sauvegardes sont mises en place pour prévenir la perte d'information.",
  },
];

export default async function RgpdPage() {
  const config = await getPublicConfig();
  const contact = config.phone || "les coordonnées de l'établissement";

  return (
    <div className="px-4 pb-16 pt-8 sm:px-6 sm:pt-12">
      <div className="mx-auto max-w-4xl">
        <Link href="/" className="inline-flex items-center gap-2 rounded-full border border-line/70 bg-surface px-3.5 py-2 text-xs font-extrabold text-muted shadow-card transition hover:text-ink">
          <ArrowLeft className="h-4 w-4" />
          Retour à l&apos;accueil
        </Link>

        <div className="relative mt-6 overflow-hidden rounded-[2rem] bg-[#12352a] px-6 py-9 text-white shadow-lift sm:px-10 sm:py-12 dark:bg-[#0d281f]">
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full border-[36px] border-white/[0.04]" />
          <div className="pointer-events-none absolute -bottom-20 -left-16 h-64 w-64 rounded-full bg-brand/20 blur-3xl" />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white/55">
              <ShieldCheck className="h-3.5 w-3.5 text-[#f0b27a]" />
              Vos données
            </span>
            <h1 className="mt-5 max-w-2xl font-display text-4xl font-semibold leading-[1.02] sm:text-5xl">
              Confidentialité & RGPD.
            </h1>
            <p className="mt-4 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
              Nous collectons uniquement les informations nécessaires pour prendre votre commande, la préparer et l&apos;encaisser.
            </p>
            <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">Dernière mise à jour · 23 octobre 2026</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          {[
            { icon: Database, title: "Données limitées", text: "Commande, table, contact si fourni." },
            { icon: Cookie, title: "Pas de traceurs pub", text: "Aucun cookie publicitaire tiers." },
            { icon: LockKeyhole, title: "Accès protégé", text: "Caisse et administration sécurisées." },
          ].map((item) => (
            <div key={item.title} className="rounded-[1.4rem] border border-line/70 bg-surface p-4 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-soft text-brand-dark">
                <item.icon className="h-4 w-4" />
              </span>
              <p className="mt-3 text-sm font-extrabold text-ink">{item.title}</p>
              <p className="mt-1 text-[11px] leading-relaxed text-muted">{item.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-[1.6rem] border border-line/70 bg-surface px-5 py-6 shadow-card sm:px-8 sm:py-8">
          <div className="space-y-7">
            {sections.map((section, index) => (
              <section key={section.title}>
                <div className="flex items-baseline gap-3">
                  <span className="text-[10px] font-extrabold tracking-[0.18em] text-brand">0{index + 1}</span>
                  <h2 className="font-display text-xl font-semibold text-ink">{section.title}</h2>
                </div>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  {section.body(config.restaurantName, config.address, config.phone)}
                </p>
              </section>
            ))}

            <section className="rounded-2xl border border-line/70 bg-cream/50 p-4">
              <div className="flex items-baseline gap-3">
                <span className="text-[10px] font-extrabold tracking-[0.18em] text-brand">09</span>
                <h2 className="font-display text-xl font-semibold text-ink">Contact</h2>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Pour toute question ou demande relative à vos données, contactez {config.restaurantName}
                {config.address ? `, ${config.address}` : ""}. Vous pouvez aussi nous joindre au {contact}.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
