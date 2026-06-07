import { and, eq } from "drizzle-orm";
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

export async function getStockBalancesForCompany(companyId: string, locationId?: string | null) {
  const movementRows = await db
    .select({
      itemId: stockMovements.itemId,
      type: stockMovements.movementType,
      quantity: stockMovements.quantity,
      fromLocationId: stockMovements.fromLocationId,
      toLocationId: stockMovements.toLocationId,
      toLocationType: inventoryLocations.type,
    })
    .from(stockMovements)
    .leftJoin(inventoryLocations, eq(stockMovements.toLocationId, inventoryLocations.id))
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
