"use client";

import type { QcChecklistItem, QualityDecision } from "@/lib/quality";

export type QualityLot = {
  id: string;
  num: string;
  productName: string;
  lot: string | null;
  planned: number;
  status: string;
  cureUntil: string | null;
  cureDayLeft: number | null;
  quality: { decision?: string; note?: string; reviewedAt?: string } | null;
};

async function parseLots(res: Response) {
  if (!res.ok) throw new Error("quality_request_failed");
  const payload = await res.json() as { lots?: QualityLot[] };
  return payload.lots ?? [];
}

export async function loadQualityLots() {
  return parseLots(await fetch("/api/app/quality", { cache: "no-store", credentials: "include" }));
}

export async function submitQualityReview(input: {
  productionId: string;
  decision: QualityDecision;
  checklist: QcChecklistItem[];
  note: string;
  lossQty?: number;
}) {
  return parseLots(await fetch("/api/app/quality", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }));
}
