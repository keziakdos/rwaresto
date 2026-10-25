import { NextResponse } from "next/server";
import { getPublicConfig } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  const config = await getPublicConfig();
  const shortName = config.restaurantName.slice(0, 12);
  return NextResponse.json(
    {
      name: `${config.restaurantName} · Commande à table`,
      short_name: shortName,
      description: config.tagline,
      start_url: "/",
      display: "standalone",
      background_color: "#FBF6ED",
      theme_color: config.primaryColor,
      lang: "fr",
      orientation: "portrait",
      icons: [
        { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any maskable" },
        { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
      ],
    },
    {
      headers: {
        "Content-Type": "application/manifest+json",
        "Cache-Control": "public, max-age=0, must-revalidate",
      },
    },
  );
}
