import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Espace équipe", template: "%s · Rwaresto équipe" },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-dvh bg-cream">{children}</div>;
}
