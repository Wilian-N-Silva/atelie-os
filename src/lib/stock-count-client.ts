"use client";

export type StockCountSummary = { total: number; counted: number; divergent: number };

export type StockCountListItem = {
  id: string;
  code: string;
  status: string;
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
};

export type StockCountDetail = {
  id: string;
  code: string;
  status: string;
  note: string;
  createdAt: string | null;
  appliedAt: string | null;
  summary: StockCountSummary;
  items: StockCountItem[];
};

export async function loadStockCounts() {
  const res = await fetch("/api/app/stock-counts", { cache: "no-store", credentials: "include" });
  if (!res.ok) throw new Error("stock_counts_request_failed");
  const payload = await res.json() as { counts?: StockCountListItem[] };
  return payload.counts ?? [];
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

export async function createStockCount(note = "") {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ note }),
  }));
}

export async function saveStockCount(countId: string, items: { itemId: string; countedQty: number | null }[]) {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ countId, action: "save", items }),
  }));
}

export async function applyStockCount(countId: string) {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ countId, action: "apply" }),
  }));
}

export async function cancelStockCount(countId: string) {
  return parseDetail(await fetch("/api/app/stock-counts", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ countId, action: "cancel" }),
  }));
}
