"use client";

import { createContext, useContext } from "react";
import type { PublicConfig } from "@/lib/settings";
import { formatMoney } from "@/lib/format";

const SiteContext = createContext<PublicConfig | null>(null);

export function SiteProvider({
  config,
  children,
}: {
  config: PublicConfig;
  children: React.ReactNode;
}) {
  return <SiteContext.Provider value={config}>{children}</SiteContext.Provider>;
}

export function useSite(): PublicConfig {
  const value = useContext(SiteContext);
  if (!value) throw new Error("SiteProvider absent");
  return value;
}

export function useMoney() {
  const { currency } = useSite();
  return (cents: number) => formatMoney(cents, currency);
}
