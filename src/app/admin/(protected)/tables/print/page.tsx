import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/db";
import { requireAdminPage } from "@/lib/page-auth";
import { getPublicConfig } from "@/lib/settings";
import { PrintButton } from "@/components/admin/print-button";

export const dynamic = "force-dynamic";
export const metadata = { title: "Planche QR codes", robots: { index: false, follow: false } };

export default async function TablesPrintPage() {
  await requireAdminPage();
  const [tables, site] = await Promise.all([
    prisma.diningTable.findMany({ where: { active: true }, orderBy: { number: "asc" } }),
    getPublicConfig(),
  ]);

  const origin = (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

  return (
    <div>
      <style>{`
        @page { size: A4 portrait; margin: 8mm; }
        @media print {
          .sheet { margin: 0 !important; padding: 0 !important; }
          .qr-tile { break-inside: avoid; }
        }
      `}</style>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/admin/tables" className="mb-1 inline-flex items-center gap-1 text-xs font-bold text-stone-400 hover:text-brand">
            <ArrowLeft className="h-3.5 w-3.5" />
            Retour aux tables
          </Link>
          <h1 className="font-display text-2xl font-bold text-forest">Planche QR codes · A4</h1>
          <p className="text-sm text-stone-500">
            {tables.length} table{tables.length > 1 ? "s" : ""} · 6 QR par page, prêts à découper.
          </p>
        </div>
        <PrintButton />
      </div>

      <div className="sheet mx-auto max-w-[210mm] bg-white shadow-card print:shadow-none">
        <div className="hidden border-b-2 border-black pb-2 text-center print:block">
          <p className="text-lg font-bold uppercase">{site.restaurantName}</p>
          <p className="text-xs">Scannez pour commander depuis votre table</p>
        </div>
        <div className="grid grid-cols-2">
          {tables.map((table) => (
            <div
              key={table.id}
              className="qr-tile flex h-[128mm] flex-col items-center justify-center border border-dashed border-stone-300 p-6 print:h-[133mm] print:border-stone-400"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/admin/tables/${table.id}/qr?format=png&inline=1`}
                alt={`QR code table ${table.number}`}
                className="h-[72mm] w-[72mm] object-contain"
              />
              <p className="mt-4 text-xs font-bold uppercase tracking-widest text-stone-500">
                Scannez pour commander
              </p>
              <p className="mt-1 font-display text-[34pt] font-bold leading-none text-black">
                Table {table.number}
              </p>
              <p className="mt-2 text-[8pt] text-stone-400">
                {origin}/?table={table.number}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
