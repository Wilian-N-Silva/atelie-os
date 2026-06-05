"use client";

export type Supplier = {
  id: string;
  name: string;
  document: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
};

export type Purchase = {
  id: string;
  number: string;
  status: string;
  reference: string | null;
  total: number;
  receivedAt: string;
  supplierId: string | null;
  supplierName: string | null;
  lines: Array<{ id: string; itemId: string; sku: string; name: string; quantity: number; unitCost: number; lot: string | null; expiresAt: string | null }>;
};

export type FinanceEntry = {
  id: string;
  type: "income" | "expense" | string;
  status: string;
  description: string;
  amount: number;
  dueAt: string | null;
  paidAt: string | null;
  sourceType: string | null;
  sourceId: string | null;
  createdAt: string;
  actorName: string | null;
};

export type Incident = {
  id: string;
  type: string;
  status: string;
  quantity: number | null;
  reason: string;
  resolution: string | null;
  createdAt: string;
  orderNumber: string | null;
  itemSku: string | null;
  itemName: string | null;
};

async function parse<T>(res: Response, key: string) {
  if (!res.ok) throw new Error(`${key}_request_failed`);
  const payload = await res.json() as Record<string, T>;
  return payload[key];
}

export async function loadSuppliers() {
  return parse<Supplier[]>(await fetch("/api/app/suppliers", { cache: "no-store", credentials: "include" }), "suppliers");
}

export async function createSupplier(input: Partial<Supplier>) {
  return parse<Supplier[]>(await fetch("/api/app/suppliers", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }), "suppliers");
}

export async function loadPurchases() {
  return parse<Purchase[]>(await fetch("/api/app/purchases", { cache: "no-store", credentials: "include" }), "purchases");
}

export async function createPurchase(input: {
  supplierId?: string | null;
  reference?: string;
  status?: string;
  lines: Array<{ itemId: string; quantity: number; unitCost: number; lot?: string; expiresAt?: string }>;
}) {
  return parse<Purchase[]>(await fetch("/api/app/purchases", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }), "purchases");
}

export async function loadFinance() {
  return parse<FinanceEntry[]>(await fetch("/api/app/finance", { cache: "no-store", credentials: "include" }), "entries");
}

export async function createFinanceEntry(input: Partial<FinanceEntry>) {
  return parse<FinanceEntry[]>(await fetch("/api/app/finance", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }), "entries");
}

export async function loadIncidents() {
  return parse<Incident[]>(await fetch("/api/app/incidents", { cache: "no-store", credentials: "include" }), "incidents");
}

export async function createIncident(input: Record<string, unknown>) {
  return parse<Incident[]>(await fetch("/api/app/incidents", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }), "incidents");
}
