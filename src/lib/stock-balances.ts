import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { inventoryLocations, items, stockMovements } from "@/db/schema";

export type StockBalance = {
  physical: number;
  reserved: number;
  inCure: number;
  blocked: number;
  available: number;
};

type StockMovementType = (typeof stockMovements.$inferSelect)["movementType"];

export function emptyStockBalance(): StockBalance {
  return {
    physical: 0,
    reserved: 0,
    inCure: 0,
    blocked: 0,
    available: 0,
  };
}

export function roundStock(value: number) {
  return Math.round(value * 1000) / 1000;
}

function normalizeBalance(balance: StockBalance): StockBalance {
  return {
    physical: roundStock(balance.physical),
    reserved: roundStock(balance.reserved),
    inCure: roundStock(balance.inCure),
    blocked: roundStock(balance.blocked),
    available: roundStock(balance.physical - balance.reserved - balance.inCure - balance.blocked),
  };
}

export function applyStockMovement(balance: StockBalance, movement: {
  type: StockMovementType;
  quantity: string;
  toLocationType: string | null;
}) {
  const quantity = Number(movement.quantity);

  switch (movement.type) {
    case "purchase_entry":
    case "adjustment_positive":
    case "return":
      balance.physical += quantity;
      break;
    case "production_output":
      if (movement.toLocationType === "cure") {
        balance.inCure += quantity;
      } else {
        balance.physical += quantity;
      }
      break;
    case "adjustment_negative":
    case "loss":
    case "production_consumption":
    case "order_shipment":
      balance.physical -= quantity;
      break;
    case "reservation":
      balance.reserved += quantity;
      break;
    case "reservation_release":
      balance.reserved -= quantity;
      break;
    case "block":
      balance.blocked += quantity;
      break;
    case "release":
      balance.blocked -= quantity;
      break;
    case "transfer":
      break;
  }
}

export async function getStockBalancesForCompany(companyId: string) {
  const movementRows = await db
    .select({
      itemId: stockMovements.itemId,
      type: stockMovements.movementType,
      quantity: stockMovements.quantity,
      toLocationType: inventoryLocations.type,
    })
    .from(stockMovements)
    .leftJoin(inventoryLocations, eq(stockMovements.toLocationId, inventoryLocations.id))
    .innerJoin(items, and(eq(stockMovements.itemId, items.id), eq(items.companyId, companyId)))
    .where(eq(stockMovements.companyId, companyId));

  const balances = new Map<string, StockBalance>();

  for (const movement of movementRows) {
    const balance = balances.get(movement.itemId) ?? emptyStockBalance();
    applyStockMovement(balance, movement);
    balances.set(movement.itemId, balance);
  }

  for (const [itemId, balance] of balances) {
    balances.set(itemId, normalizeBalance(balance));
  }

  return balances;
}
