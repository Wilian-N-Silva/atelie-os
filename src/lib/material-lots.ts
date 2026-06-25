import type { MaterialLotAllocation } from "@/lib/domain";

export type MaterialLotOption = {
  itemId: string;
  lot: string;
  available: number;
  unitCost: number | null;
  lastMovementAt: string | null;
};

type MovementType =
  | "purchase_entry"
  | "adjustment_positive"
  | "adjustment_negative"
  | "loss"
  | "production_consumption"
  | "production_output"
  | "order_shipment"
  | "return"
  | "block"
  | "release"
  | "transfer"
  | "reservation"
  | "reservation_release";

export type MaterialLotMovement = {
  itemId: string;
  movementType: MovementType | string;
  quantity: string | number;
  metadata: Record<string, unknown> | null;
  occurredAt?: Date | string | null;
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function roundQty(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function materialLotFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  const lot = cleanString(metadata?.materialLot, 80) || cleanString(metadata?.lot, 80);
  return lot || null;
}

export function cleanMaterialLotAllocations(value: unknown): MaterialLotAllocation[] {
  if (!Array.isArray(value)) return [];
  const result: MaterialLotAllocation[] = [];
  const seen = new Set<string>();

  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const allocation = entry as Partial<MaterialLotAllocation>;
    const itemId = cleanString(allocation.itemId, 80);
    const sku = cleanString(allocation.sku, 64).toUpperCase();
    const lot = cleanString(allocation.lot, 80);
    const quantity = roundQty(Number(allocation.quantity));
    if (!itemId || !sku || !lot || !Number.isFinite(quantity) || quantity <= 0) continue;

    const key = `${itemId}:${lot}`;
    if (seen.has(key)) {
      const existing = result.find((item) => item.itemId === itemId && item.lot === lot);
      if (existing) existing.quantity = roundQty(existing.quantity + quantity);
    } else {
      seen.add(key);
      result.push({ itemId, sku, lot, quantity });
    }
  }

  return result;
}

export function materialLotAllocationsFromMetadata(metadata: Record<string, unknown> | null | undefined) {
  return cleanMaterialLotAllocations(metadata?.materialLots);
}

function movementEffect(type: string) {
  if (["purchase_entry", "adjustment_positive", "production_output", "return"].includes(type)) return 1;
  if (["adjustment_negative", "loss", "production_consumption", "order_shipment"].includes(type)) return -1;
  return 0;
}

export function summarizeMaterialLotOptions(movements: MaterialLotMovement[]): MaterialLotOption[] {
  const lots = new Map<string, {
    itemId: string;
    lot: string;
    available: number;
    costQty: number;
    costTotal: number;
    lastMovementAt: string | null;
  }>();

  for (const movement of movements) {
    const metadata = movement.metadata ?? {};
    const lot = materialLotFromMetadata(metadata);
    if (!lot) continue;

    const effect = movementEffect(movement.movementType);
    if (!effect) continue;

    const quantity = Number(movement.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) continue;

    const key = `${movement.itemId}:${lot}`;
    const current = lots.get(key) ?? {
      itemId: movement.itemId,
      lot,
      available: 0,
      costQty: 0,
      costTotal: 0,
      lastMovementAt: null,
    };

    current.available = roundQty(current.available + quantity * effect);
    const occurredAt = movement.occurredAt instanceof Date
      ? movement.occurredAt.toISOString()
      : typeof movement.occurredAt === "string"
        ? movement.occurredAt
        : null;
    if (occurredAt && (!current.lastMovementAt || occurredAt > current.lastMovementAt)) {
      current.lastMovementAt = occurredAt;
    }

    const unitCost = Number(metadata.unitCost);
    if (effect > 0 && Number.isFinite(unitCost) && unitCost >= 0) {
      current.costQty += quantity;
      current.costTotal += quantity * unitCost;
    }

    lots.set(key, current);
  }

  return [...lots.values()]
    .filter((lot) => lot.available > 0)
    .map((lot) => ({
      itemId: lot.itemId,
      lot: lot.lot,
      available: roundQty(lot.available),
      unitCost: lot.costQty > 0 ? Math.round((lot.costTotal / lot.costQty) * 10000) / 10000 : null,
      lastMovementAt: lot.lastMovementAt,
    }))
    .sort((a, b) => {
      if (a.itemId !== b.itemId) return a.itemId.localeCompare(b.itemId);
      return (a.lastMovementAt ?? "").localeCompare(b.lastMovementAt ?? "");
    });
}
