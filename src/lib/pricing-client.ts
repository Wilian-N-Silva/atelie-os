"use client";

import type { PricingProduct } from "@/lib/pricing-server";

export type { PricingProduct };

export type PriceHistoryEntry = {
  price: number;
  previousPrice: number | null;
  marginPct: number | null;
  at: string | null;
};

async function parseProducts(res: Response) {
  if (!res.ok) throw new Error("pricing_request_failed");
  const payload = await res.json() as { products?: PricingProduct[] };
  return payload.products ?? [];
}

export async function loadPricing() {
  const res = await fetch("/api/app/pricing", { cache: "no-store", credentials: "include" });
  return parseProducts(res);
}

export async function savePricing(input: {
  itemId: string;
  practicedPrice: number;
  minMargin: number;
  laborCost: number;
  extraCost: number;
}) {
  const res = await fetch("/api/app/pricing", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });
  return parseProducts(res);
}

export async function loadPriceHistory(itemId: string) {
  const res = await fetch(`/api/app/pricing?itemId=${encodeURIComponent(itemId)}`, { cache: "no-store", credentials: "include" });
  if (!res.ok) return [] as PriceHistoryEntry[];
  const payload = await res.json() as { history?: PriceHistoryEntry[] };
  return payload.history ?? [];
}
