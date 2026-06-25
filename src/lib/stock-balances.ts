import { and, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { inventoryLocations, items, stockMovements } from "@/db/schema";
import {
  applyLocationStockMovement,
  applyStockMovement,
  emptyStockBalance,
  normalizeBalance,
  type StockBalance,
} from "@/lib/stock-balance-math";

export {
  applyLocationStockMovement,
  applyStockMovement,
  emptyStockBalance,
  normalizeBalance,
  roundStock,
} from "@/lib/stock-balance-math";
export type { StockBalance, StockMovementBalanceInput } from "@/lib/stock-balance-math";

const fromLocations = alias(inventoryLocations, "stock_balance_from_locations");
const toLocations = alias(inventoryLocations, "stock_balance_to_locations");

export async function getStockBalancesForCompany(companyId: string, locationId?: string | null) {
  const movementRows = await db
    .select({
      itemId: stockMovements.itemId,
      type: stockMovements.movementType,
      quantity: stockMovements.quantity,
      fromLocationId: stockMovements.fromLocationId,
      toLocationId: stockMovements.toLocationId,
      fromLocationType: fromLocations.type,
      toLocationType: toLocations.type,
    })
    .from(stockMovements)
    .leftJoin(fromLocations, eq(stockMovements.fromLocationId, fromLocations.id))
    .leftJoin(toLocations, eq(stockMovements.toLocationId, toLocations.id))
    .innerJoin(items, and(eq(stockMovements.itemId, items.id), eq(items.companyId, companyId)))
    .where(eq(stockMovements.companyId, companyId));

  const balances = new Map<string, StockBalance>();

  for (const movement of movementRows) {
    const balance = balances.get(movement.itemId) ?? emptyStockBalance();
    if (locationId) {
      applyLocationStockMovement(balance, movement, locationId);
    } else {
      applyStockMovement(balance, movement);
    }
    balances.set(movement.itemId, balance);
  }

  for (const [itemId, balance] of balances) {
    balances.set(itemId, normalizeBalance(balance));
  }

  return balances;
}
