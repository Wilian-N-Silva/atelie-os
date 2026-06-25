"use client";

export type StockCountSummary = { total: number; counted: number; divergent: number };

export type StockCountLocation = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type StockCountListItem = {
  id: string;
  code: string;
  status: string;
  locationId: string | null;
  location: StockCountLocation | null;
  createdAt: string | null;
  appliedAt: string | null;
  summary: StockCountSummary;
};

export type StockCountItem = {
  itemId: string;
  sku: string;
  name: string;
  expected: number;
  counted: number | null;
  lossReason: string;
};

export type StockCountDetail = {
  id: string;
  code: string;
  status: string;
  note: string;
  locationId: string | null;
  location: StockCountLocation | null;
  createdAt: string | null;
  appliedAt: string | null;
  summary: StockCountSummary;
  items: StockCountItem[];
};

export type StockCountsResponse = {
  counts: StockCountListItem[];
  locations: StockCountLocation[];
};

export async function loadStockCounts() {
  const res = await fetch("/api/app/stock-counts", { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("stock_counts_request_failed");
  const payload = await res.json() as Partial<StockCountsResponse>;
  return { counts: payload.counts ?? [], locations: payload.locations ?? [] };
}

async function parseDetail(res: Response) {
  if (!res.ok) throw new Error("stock_count_request_failed");
  const payload = await res.json() as { count?: StockCountDetail };
  if (!payload.count) throw new Error("stock_count_missing");
  return payload.count;
}

export async function loadStockCount(id: string) {
  return parseDetail(await fetch(`/api/app/stock-counts?id=${encodeURIComponent(id)}`, { cache: "no-store", credentials: "include" }));
}

export async function createStockCount(note = "", locationId: string | null = null) {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ note, locationId }),
  }));
}

export async function saveStockCount(countId: string, items: { itemId: string; countedQty: number | null; lossReason?: string }[]) {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ countId, action: "save", items }),
  }));
}

export async function applyStockCount(countId: string) {
  const res = await fetch("/api/app/stock-counts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ countId, action: "apply" }),
  });
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string; sku?: string } | null;
    throw new Error(payload?.error === "loss_reason_required" ? `loss_reason_required:${payload.sku ?? ""}` : "stock_count_request_failed");
  }
  return parseDetail(res);
}

export async function cancelStockCount(countId: string) {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ countId, action: "cancel" }),
  }));
}
