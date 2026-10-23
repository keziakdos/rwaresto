import type { Metadata, Viewport } from "next";
import "@fontsource-variable/dm-sans";
import "@fontsource-variable/fraunces";
import "@fontsource-variable/fraunces/opsz.css";
import "./globals.css";
import { SiteProvider } from "@/components/site-provider";
import { CartProvider } from "@/components/cart-provider";
import { ToastProvider } from "@/components/toast-provider";
import { ServiceWorker } from "@/components/service-worker";
import { ThemeScript } from "@/components/theme-script";
import { getPublicConfig } from "@/lib/settings";
import { themeVariables } from "@/lib/colors";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.SITE_URL || "http://localhost:3000"),
  title: {
    default: "Rwaresto · Commande à table",
    template: "%s · Rwaresto",
  },
  description:
    "Commandez depuis votre table, suivez la préparation en direct et payez à la caisse. Des bols généreux et des saveurs qui voyagent.",
  applicationName: "Rwaresto",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  openGraph: {
    title: "Rwaresto · Commande à table",
    description:
      "Scannez, composez, savourez. Commandez depuis votre table et payez à la caisse.",
    type: "website",
    locale: "fr_FR",
    siteName: "Rwaresto",
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "Rwaresto" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Rwaresto · Commande à table",
    description: "Commandez depuis votre table, suivez la préparation en direct.",
    images: ["/og.png"],
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#C4512C",
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const config = await getPublicConfig();
  const style = themeVariables(config.primaryColor, config.accentColor) as React.CSSProperties;

  return (
    <html lang="fr" style={style} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="antialiased">
        <SiteProvider config={config}>
          <ToastProvider>
            <CartProvider>{children}</CartProvider>
          </ToastProvider>
        </SiteProvider>
        <ServiceWorker />
      </body>
    </html>
  );
}
