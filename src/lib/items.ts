export type ItemType = "raw_material" | "packaging" | "finished_good" | "kit" | "auxiliary";
export type ItemStatus = "active" | "archived" | "blocked";
export type ItemStockStatus = "below_minimum" | "ok" | "no_minimum";

export type CatalogItem = {
  id: string;
  code: string;
  sku: string;
  name: string;
  variant: string | null;
  type: ItemType;
  category: string | null;
  unit: string;
  defaultLocation: string | null;
  min: number;
  physical: number;
  reserved: number;
  inCure: number;
  blocked: number;
  available: number;
  estimatedCost: number | null;
  averageCost: number | null;
  suggestedPrice: number | null;
  currentPrice: number | null;
  weightG: number | null;
  packedWeightG: number | null;
  dimensions: string | null;
  packedDimensions: string | null;
  fragile: boolean;
  sellable: boolean;
  tracksLot: boolean;
  status: ItemStatus;
  stockStatus: ItemStockStatus;
  metadata: {
    aroma: string | null;
    collection: string | null;
    cureDays: number | null;
  };
};

export type ItemsResponse = {
  companyName: string;
  cards: {
    total: number;
    active: number;
    sellable: number;
    belowMinimum: number;
    rawMaterials: number;
    packaging: number;
    finishedGoods: number;
    kits: number;
  };
  items: CatalogItem[];
};

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  raw_material: "Materia-prima",
  packaging: "Embalagem",
  finished_good: "Produto pronto",
  kit: "Kit",
  auxiliary: "Auxiliar",
};

export const ITEM_TYPE_TONES: Record<ItemType, string> = {
  raw_material: "info",
  packaging: "neutral",
  finished_good: "ok",
  kit: "cure",
  auxiliary: "neutral",
};

export const ITEM_STATUS_LABELS: Record<ItemStatus, string> = {
  active: "Ativo",
  archived: "Arquivado",
  blocked: "Bloqueado",
};

export const ITEM_STATUS_TONES: Record<ItemStatus, string> = {
  active: "ok",
  archived: "neutral",
  blocked: "bad",
};

export async function fetchItems(): Promise<ItemsResponse> {
  const res = await fetch("/api/app/items", {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel carregar os itens.");
  }

  return (await res.json()) as ItemsResponse;
}
