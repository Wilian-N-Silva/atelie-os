"use client";

import type { MaterialLotOption } from "@/lib/material-lots";

export async function loadMaterialLotOptions(itemIds: string[]) {
  if (!itemIds.length) return [];
  const query = encodeURIComponent(Array.from(new Set(itemIds)).join(","));
  const res = await fetch(`/api/app/material-lots?itemIds=${query}`, {
    cache: "no-store",
    credentials: "include",
  });
  if (!res.ok) throw new Error("material_lots_request_failed");
  const payload = await res.json() as { lots?: MaterialLotOption[] };
  return payload.lots ?? [];
}
