"use client";

import type { ReplenishmentSuggestion } from "@/lib/replenishment";

export type ReplenishmentResponse = {
  suggestions: ReplenishmentSuggestion[];
  totals: {
    critical: number;
    warning: number;
    suggestedQty: number;
    orderDemand: number;
    productionDemand: number;
  };
};

export async function loadReplenishment() {
  const res = await fetch("/api/app/replenishment", {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("replenishment_request_failed");
  return await res.json() as ReplenishmentResponse;
}
