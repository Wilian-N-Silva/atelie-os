"use client";

export type ImportOrderLine = { sku: string; qty: number; price: number };
export type ImportOrderRow = {
  id: string;
  channelKey: string;
  externalOrderId: string;
  buyerName: string;
  buyerEmail: string | null;
  status: string;
  errorReason: string | null;
  total: number;
  lines: ImportOrderLine[];
  tracking: string;
  labelPdfUrl: string;
  createdOrderId: string | null;
};
export type ImportMapping = { id: string; channelKey: string; externalSku: string; itemId: string | null; itemSku: string | null; itemName: string | null };
export type ImportsData = {
  imports: ImportOrderRow[];
  mappings: ImportMapping[];
  summary: { pending: number; ready: number; imported: number };
  created?: number;
  imported?: number;
};

async function parse(res: Response): Promise<ImportsData> {
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "imports_request_failed");
  }
  return res.json() as Promise<ImportsData>;
}

export async function loadImports() {
  return parse(await fetch("/api/app/imports", { cache: "no-store", credentials: "include" }));
}

export async function uploadImportCsv(channelKey: string, csv: string) {
  return parse(await fetch("/api/app/imports", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ channelKey, csv }),
  }));
}

async function patch(body: Record<string, unknown>) {
  return parse(await fetch("/api/app/imports", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  }));
}

export async function mapImportSku(channelKey: string, externalSku: string, itemId: string) {
  return patch({ action: "map", channelKey, externalSku, itemId });
}
export async function importOrder(importId: string) {
  return patch({ action: "import", importId });
}
export async function importAllReady() {
  return patch({ action: "import_all" });
}
export async function discardImport(importId: string) {
  return patch({ action: "discard", importId });
}
export async function saveImportShipment(importId: string, tracking: string, labelPdfUrl: string) {
  return patch({ action: "shipment", importId, tracking, labelPdfUrl });
}
