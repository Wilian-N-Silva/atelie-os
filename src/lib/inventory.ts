import type { ItemMovementType, ItemStockStatus, ItemType } from "@/lib/items";

export type InventoryLocation = {
  id: string;
  code: string;
  name: string;
  type: string;
  isActive: boolean;
};

export type InventoryItemBalance = {
  id: string;
  code: string;
  sku: string;
  name: string;
  variant: string | null;
  type: ItemType;
  category: string | null;
  unit: string;
  defaultLocationId: string | null;
  defaultLocation: string | null;
  min: number;
  physical: number;
  reserved: number;
  inCure: number;
  blocked: number;
  available: number;
  stockStatus: ItemStockStatus;
};

export type InventoryMovementLocation = {
  id: string;
  code: string;
  name: string;
  type: string;
};

export type InventoryMovement = {
  id: string;
  itemId: string;
  itemCode: string;
  itemSku: string;
  itemName: string;
  itemVariant: string | null;
  movementType: ItemMovementType;
  quantity: number;
  unit: string;
  reason: string | null;
  sourceType: string | null;
  sourceId: string | null;
  occurredAt: string;
  actorName: string | null;
  fromLocation: InventoryMovementLocation | null;
  toLocation: InventoryMovementLocation | null;
};

export type InventoryResponse = {
  companyName: string;
  selectedLocationId: string | null;
  cards: {
    totalItems: number;
    belowMinimum: number;
    physical: number;
    reserved: number;
    inCure: number;
    blocked: number;
    available: number;
    locations: number;
    movements: number;
  };
  locations: InventoryLocation[];
  items: InventoryItemBalance[];
  movements: InventoryMovement[];
};

export async function fetchInventory(locationId?: string | null): Promise<InventoryResponse> {
  const params = new URLSearchParams();
  if (locationId) params.set("locationId", locationId);
  const query = params.toString();

  const res = await fetch(`/api/app/inventory${query ? `?${query}` : ""}`, {
    cache: "no-store",
    credentials: "include",
  });

  if (!res.ok) {
    const payload = (await res.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Nao foi possivel carregar o estoque.");
  }

  return (await res.json()) as InventoryResponse;
}
