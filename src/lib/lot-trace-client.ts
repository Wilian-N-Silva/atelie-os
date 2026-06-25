"use client";

import type { LotTrace } from "@/lib/lot-trace";

async function parseTrace(res: Response) {
  if (!res.ok) throw new Error("lot_trace_request_failed");
  const payload = await res.json() as { trace?: LotTrace };
  return payload.trace ?? null;
}

export async function loadLotTrace(productionId: string) {
  return parseTrace(await fetch(`/api/app/lot-trace?productionId=${encodeURIComponent(productionId)}`, {
    cache: "no-store",
    credentials: "include",
  }));
}
