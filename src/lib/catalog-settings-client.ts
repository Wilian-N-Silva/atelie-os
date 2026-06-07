"use client";

export type CatalogUnit = { id: string; code: string; name: string; kind: string; inUse: boolean; protected: boolean };
export type CatalogCategory = { id: string; name: string; kind: string; inUse: boolean };
export type CatalogSettings = { units: CatalogUnit[]; categories: CatalogCategory[] };

async function parse(res: Response): Promise<CatalogSettings> {
  if (!res.ok) {
    const payload = await res.json().catch(() => null) as { error?: string } | null;
    throw new Error(payload?.error ?? "catalog_request_failed");
  }
  return res.json() as Promise<CatalogSettings>;
}

export async function loadCatalogSettings() {
  return parse(await fetch("/api/app/catalog-settings", { cache: "no-store", credentials: "include" }));
}

export async function createCatalogEntry(input: { resource: "unit" | "category"; name: string; kind: string; code?: string }) {
  return parse(await fetch("/api/app/catalog-settings", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }));
}

export async function renameCatalogEntry(input: { resource: "unit" | "category"; id: string; name: string }) {
  return parse(await fetch("/api/app/catalog-settings", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  }));
}

export async function deleteCatalogEntry(resource: "unit" | "category", id: string) {
  return parse(await fetch(`/api/app/catalog-settings?resource=${resource}&id=${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  }));
}
