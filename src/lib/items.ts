export type ItemType = "raw_material" | "packaging" | "finished_good" | "kit" | "auxiliary";
export type ItemStatus = "active" | "archived" | "blocked";
export type ItemStockStatus = "below_minimum" | "ok" | "no_minimum";

export type ItemLookup = {
  id: string;
  code?: string;
  name: string;
  kind?: string;
  type?: string;
};

export type ItemLookups = {
  categories: ItemLookup[];
  units: ItemLookup[];
  locations: ItemLookup[];
};

export type CatalogItem = {
  id: string;
  code: string;
  sku: string;
  name: string;
  variant: string | null;
  type: ItemType;
  categoryId: string | null;
  category: string | null;
  baseUnitId: string | null;
  unit: string;
  defaultLocationId: string | null;
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
  lookups: ItemLookups;
  items: CatalogItem[];
};

export type ItemFormInput = {
  internalCode: string;
  sku: string;
  name: string;
  variant: string | null;
  type: ItemType;
  categoryId: string | null;
  baseUnitId: string;
  defaultLocationId: string | null;
  minStock: number;
  tracksLot: boolean;
  fragile: boolean;
  sellable: boolean;
  status: ItemStatus;
  estimatedCost: number | null;
  averageCost: number | null;
  suggestedPrice: number | null;
  currentPrice: number | null;
  weightG: number | null;
  packedWeightG: number | null;
  dimensions: string | null;
  packedDimensions: string | null;
  metadata: {
    aroma: string | null;
    collection: string | null;
    cureDays: number | null;
  };
};

export type ItemMutationResult = {
  itemId: string;
  code: string;
};

export type ItemMovementType =
  | "purchase_entry"
  | "adjustment_positive"
  | "adjustment_negative"
  | "loss"
  | "reservation"
  | "reservation_release"
  | "production_consumption"
  | "production_output"
  | "order_shipment"
  | "return"
  | "block"
  | "release"
  | "transfer";

export type ItemMovement = {
  id: string;
  movementType: ItemMovementType;
  quantity: number;
  unit: string;
  reason: string | null;
  sourceType: string | null;
  sourceId: string | null;
  occurredAt: string;
  actorName: string | null;
};

export type ItemMovementsResponse = {
  itemId: string;
  movements: ItemMovement[];
};

export type StockAdjustmentDirection = "increase" | "decrease";

export type StockAdjustmentInput = {
  direction: StockAdjustmentDirection;
  quantity: number;
  reason: string;
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

export const ITEM_MOVEMENT_LABELS: Record<ItemMovementType, string> = {
  purchase_entry: "Entrada de compra",
  adjustment_positive: "Ajuste positivo",
  adjustment_negative: "Ajuste negativo",
  loss: "Perda",
  reservation: "Reserva",
  reservation_release: "Liberacao de reserva",
  production_consumption: "Consumo em producao",
  production_output: "Saida de producao",
  order_shipment: "Envio de pedido",
  return: "Retorno",
  block: "Bloqueio",
  release: "Liberacao",
  transfer: "Transferencia",
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

export async function createItem(input: ItemFormInput): Promise<ItemMutationResult> {
  const res = await fetch("/api/app/items", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel criar o item.");
  }

  return (await res.json()) as ItemMutationResult;
}

export async function updateItem(itemId: string, input: ItemFormInput): Promise<ItemMutationResult> {
  const res = await fetch(`/api/app/items/${itemId}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel atualizar o item.");
  }

  return (await res.json()) as ItemMutationResult;
}

export async function fetchItemMovements(itemId: string): Promise<ItemMovementsResponse> {
  const res = await fetch(`/api/app/items/${itemId}/movements`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel carregar as movimentacoes.");
  }

  return (await res.json()) as ItemMovementsResponse;
}

export async function adjustItemStock(itemId: string, input: StockAdjustmentInput): Promise<void> {
  const res = await fetch(`/api/app/items/${itemId}/stock-adjustment`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel registrar o ajuste.");
  }
}
