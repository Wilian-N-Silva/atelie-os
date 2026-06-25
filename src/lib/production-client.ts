"use client";

import type { ProductionOrder } from "@/lib/domain";

export type ProductionPlanInput = {
  recipeVersionId: string;
  planned: number;
  plannedDateLabel: string;
  responsible: string;
};

export type ProductionPatch = Partial<
  Pick<ProductionOrder, "status" | "progress" | "lot" | "cureUntil" | "cureDayLeft" | "materialLots">
>;

async function parseProductionResponse(res: Response) {
  if (!res.ok) throw new Error("production_request_failed");
  const payload = await res.json() as { production?: ProductionOrder[] };
  return payload.production ?? [];
}

export async function loadProduction() {
  const res = await fetch("/api/app/production", {
    cache: "no-store",
    credentials: "include",
  });
  return parseProductionResponse(res);
}

export async function createProduction(production: ProductionPlanInput) {
  const res = await fetch("/api/app/production", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ production }),
  });
  return parseProductionResponse(res);
}

export async function updateProduction(productionId: string, patch: ProductionPatch) {
  const res = await fetch("/api/app/production", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ productionId, patch }),
  });
  return parseProductionResponse(res);
}
