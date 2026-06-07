import type { InventoryManualMovementInput, InventoryManualMovementType } from "@/lib/inventory";
import { roundStock, type StockBalance } from "@/lib/stock-balance-math";

const MANUAL_MOVEMENT_TYPES: InventoryManualMovementType[] = ["purchase_entry", "transfer", "loss", "block", "release"];

function cleanRequiredString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanOptionalId(value: unknown) {
  const cleaned = cleanRequiredString(value, 80);
  return cleaned || null;
}

export function parseInventoryMovementInput(payload: unknown):
  | { input: InventoryManualMovementInput }
  | { error: string } {
  if (!payload || typeof payload !== "object") return { error: "invalid_payload" };

  const data = payload as Record<string, unknown>;
  const movementType = data.movementType;
  const itemId = cleanRequiredString(data.itemId, 80);
  const quantity = roundStock(Number(data.quantity));
  const reason = cleanRequiredString(data.reason, 500);
  const fromLocationId = cleanOptionalId(data.fromLocationId);
  const toLocationId = cleanOptionalId(data.toLocationId);

  if (!MANUAL_MOVEMENT_TYPES.includes(movementType as InventoryManualMovementType)) {
    return { error: "invalid_movement_type" };
  }
  if (!itemId) return { error: "item_required" };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "invalid_quantity" };
  if (!reason) return { error: "reason_required" };

  switch (movementType) {
    case "purchase_entry":
      if (!toLocationId) return { error: "to_location_required" };
      break;
    case "loss":
      if (!fromLocationId) return { error: "from_location_required" };
      break;
    case "transfer":
    case "block":
    case "release":
      if (!fromLocationId) return { error: "from_location_required" };
      if (!toLocationId) return { error: "to_location_required" };
      if (fromLocationId === toLocationId) return { error: "same_location" };
      break;
  }

  return {
    input: {
      movementType: movementType as InventoryManualMovementType,
      itemId,
      quantity,
      fromLocationId,
      toLocationId,
      reason,
    },
  };
}

export function validateManualMovementSourceCapacity(
  input: Pick<InventoryManualMovementInput, "movementType" | "quantity">,
  balance: StockBalance,
) {
  if (input.movementType === "release") {
    return input.quantity > balance.blocked ? "insufficient_blocked_stock" : null;
  }

  if (["transfer", "loss", "block"].includes(input.movementType)) {
    return input.quantity > balance.physical ? "insufficient_source_stock" : null;
  }

  return null;
}
