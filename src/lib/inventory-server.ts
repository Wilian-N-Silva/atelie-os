import { randomUUID } from "crypto";
import { and, asc, desc, eq, inArray, or } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db/client";
import { auditLogs, categories, inventoryLocations, items, stockMovements, units, user } from "@/db/schema";
import type { AppRouteContext } from "@/lib/app-route-context";
import type {
  InventoryManualMovementInput,
  InventoryItemBalance,
  InventoryMovementLocation,
  InventoryResponse,
} from "@/lib/inventory";
import { validateManualMovementSourceCapacity } from "@/lib/inventory-validation";
import type { ItemStockStatus } from "@/lib/items";
import { emptyStockBalance, getStockBalancesForCompany, roundStock } from "@/lib/stock-balances";

const fromLocations = alias(inventoryLocations, "from_inventory_locations");
const toLocations = alias(inventoryLocations, "to_inventory_locations");

type ManualMovementLocation = {
  id: string;
  code: string;
  name: string;
  type: string;
};

type CreateInventoryMovementResult =
  | { ok: true; movementId: string; itemId: string }
  | { error: string };

function stockStatus(item: { min: number; available: number }): ItemStockStatus {
  if (item.min <= 0) return "no_minimum";
  return item.available < item.min ? "below_minimum" : "ok";
}

function movementLocation(row: {
  id: string | null;
  code: string | null;
  name: string | null;
  type: string | null;
}): InventoryMovementLocation | null {
  if (!row.id || !row.code || !row.name || !row.type) return null;
  return {
    id: row.id,
    code: row.code,
    name: row.name,
    type: row.type,
  };
}

async function getManualMovementItem(context: AppRouteContext, itemId: string) {
  const [item] = await db
    .select({
      id: items.id,
      code: items.internalCode,
      sku: items.sku,
      name: items.name,
      variant: items.variant,
      unit: units.code,
    })
    .from(items)
    .leftJoin(units, eq(items.baseUnitId, units.id))
    .where(and(eq(items.id, itemId), eq(items.companyId, context.company.id)))
    .limit(1);

  return item ?? null;
}

async function getManualMovementLocations(context: AppRouteContext, input: InventoryManualMovementInput) {
  const ids = Array.from(new Set([input.fromLocationId, input.toLocationId].filter((id): id is string => Boolean(id))));
  if (!ids.length) return new Map<string, ManualMovementLocation>();

  const rows = await db
    .select({
      id: inventoryLocations.id,
      code: inventoryLocations.code,
      name: inventoryLocations.name,
      type: inventoryLocations.type,
    })
    .from(inventoryLocations)
    .where(
      and(
        eq(inventoryLocations.companyId, context.company.id),
        eq(inventoryLocations.isActive, true),
        inArray(inventoryLocations.id, ids),
      ),
    );

  return new Map(rows.map((location) => [location.id, location]));
}

function describeLocation(location: ManualMovementLocation | null) {
  if (!location) return null;
  return {
    id: location.id,
    code: location.code,
    name: location.name,
    type: location.type,
  };
}

async function assertSourceCapacity(context: AppRouteContext, input: InventoryManualMovementInput) {
  if (!input.fromLocationId) return null;

  const balances = await getStockBalancesForCompany(context.company.id, input.fromLocationId);
  const balance = balances.get(input.itemId) ?? emptyStockBalance();

  return validateManualMovementSourceCapacity(input, balance);
}

export async function createInventoryMovement(
  context: AppRouteContext,
  input: InventoryManualMovementInput,
): Promise<CreateInventoryMovementResult> {
  const item = await getManualMovementItem(context, input.itemId);
  if (!item) return { error: "item_not_found" };

  const locations = await getManualMovementLocations(context, input);
  const fromLocation = input.fromLocationId ? locations.get(input.fromLocationId) ?? null : null;
  const toLocation = input.toLocationId ? locations.get(input.toLocationId) ?? null : null;

  if (input.fromLocationId && !fromLocation) return { error: "from_location_not_found" };
  if (input.toLocationId && !toLocation) return { error: "to_location_not_found" };
  if (input.movementType === "block" && toLocation?.type !== "blocked") return { error: "blocked_location_required" };
  if (input.movementType === "release" && fromLocation?.type !== "blocked") return { error: "blocked_source_required" };

  const capacityError = await assertSourceCapacity(context, input);
  if (capacityError) return { error: capacityError };

  const manualMovementId = randomUUID();
  const movement = await db.transaction(async (tx) => {
    const [insertedMovement] = await tx
      .insert(stockMovements)
      .values({
        companyId: context.company.id,
        itemId: item.id,
        movementType: input.movementType,
        quantity: input.quantity.toString(),
        fromLocationId: input.fromLocationId,
        toLocationId: input.toLocationId,
        reason: input.reason,
        sourceType: "manual.inventory_movement",
        sourceId: manualMovementId,
        createdByUserId: context.user.id,
        metadata: {
          manualMovementId,
          fromLocation: describeLocation(fromLocation),
          toLocation: describeLocation(toLocation),
        },
      })
      .returning({ id: stockMovements.id });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "stock.adjust",
      entityType: "item",
      entityId: item.id,
      metadata: {
        manualMovementId,
        movementId: insertedMovement.id,
        movementType: input.movementType,
        itemCode: item.code,
        sku: item.sku,
        itemName: item.name,
        itemVariant: item.variant,
        quantity: input.quantity,
        unit: item.unit ?? "un",
        reason: input.reason,
        fromLocation: describeLocation(fromLocation),
        toLocation: describeLocation(toLocation),
      },
    });

    return insertedMovement;
  });

  return {
    ok: true,
    movementId: movement.id,
    itemId: item.id,
  };
}

export async function buildInventoryResponse(
  company: AppRouteContext["company"],
  filters: { locationId?: string | null } = {},
): Promise<InventoryResponse> {
  const locationRows = await db
    .select({
      id: inventoryLocations.id,
      code: inventoryLocations.code,
      name: inventoryLocations.name,
      type: inventoryLocations.type,
      isActive: inventoryLocations.isActive,
    })
    .from(inventoryLocations)
    .where(eq(inventoryLocations.companyId, company.id))
    .orderBy(asc(inventoryLocations.name));

  const selectedLocationId = locationRows.some((location) => location.id === filters.locationId)
    ? filters.locationId ?? null
    : null;

  const [itemRows, balances] = await Promise.all([
    db
      .select({
        id: items.id,
        code: items.internalCode,
        sku: items.sku,
        name: items.name,
        variant: items.variant,
        type: items.type,
        category: categories.name,
        unit: units.code,
        defaultLocationId: items.defaultLocationId,
        defaultLocation: inventoryLocations.name,
        minStock: items.minStock,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .leftJoin(units, eq(items.baseUnitId, units.id))
      .leftJoin(inventoryLocations, eq(items.defaultLocationId, inventoryLocations.id))
      .where(eq(items.companyId, company.id))
      .orderBy(asc(items.name), asc(items.variant)),
    getStockBalancesForCompany(company.id, selectedLocationId),
  ]);

  const allItems = itemRows.map((row): InventoryItemBalance => {
    const balance = balances.get(row.id) ?? emptyStockBalance();
    const min = Number(row.minStock);
    const item = {
      id: row.id,
      code: row.code,
      sku: row.sku,
      name: row.name,
      variant: row.variant,
      type: row.type,
      category: row.category,
      unit: row.unit ?? "un",
      defaultLocationId: row.defaultLocationId,
      defaultLocation: row.defaultLocation,
      min,
      physical: balance.physical,
      reserved: balance.reserved,
      inCure: balance.inCure,
      blocked: balance.blocked,
      available: balance.available,
      stockStatus: "ok" as ItemStockStatus,
    };

    return {
      ...item,
      stockStatus: stockStatus(item),
    };
  });

  const inventoryItems = selectedLocationId
    ? allItems.filter((item) => {
        const hasLocationBalance =
          item.physical !== 0 ||
          item.reserved !== 0 ||
          item.inCure !== 0 ||
          item.blocked !== 0 ||
          item.available !== 0;
        return item.defaultLocationId === selectedLocationId || hasLocationBalance;
      })
    : allItems;

  const movementWhere = selectedLocationId
    ? and(
        eq(stockMovements.companyId, company.id),
        or(
          eq(stockMovements.fromLocationId, selectedLocationId),
          eq(stockMovements.toLocationId, selectedLocationId),
        ),
      )
    : eq(stockMovements.companyId, company.id);

  const movementRows = await db
    .select({
      id: stockMovements.id,
      itemId: items.id,
      itemCode: items.internalCode,
      itemSku: items.sku,
      itemName: items.name,
      itemVariant: items.variant,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      unit: units.code,
      reason: stockMovements.reason,
      sourceType: stockMovements.sourceType,
      sourceId: stockMovements.sourceId,
      occurredAt: stockMovements.occurredAt,
      actorName: user.name,
      fromLocationId: fromLocations.id,
      fromLocationCode: fromLocations.code,
      fromLocationName: fromLocations.name,
      fromLocationType: fromLocations.type,
      toLocationId: toLocations.id,
      toLocationCode: toLocations.code,
      toLocationName: toLocations.name,
      toLocationType: toLocations.type,
    })
    .from(stockMovements)
    .innerJoin(items, and(eq(stockMovements.itemId, items.id), eq(items.companyId, company.id)))
    .leftJoin(units, eq(items.baseUnitId, units.id))
    .leftJoin(user, eq(stockMovements.createdByUserId, user.id))
    .leftJoin(fromLocations, eq(stockMovements.fromLocationId, fromLocations.id))
    .leftJoin(toLocations, eq(stockMovements.toLocationId, toLocations.id))
    .where(movementWhere)
    .orderBy(desc(stockMovements.occurredAt))
    .limit(60);

  const totals = inventoryItems.reduce(
    (acc, item) => ({
      physical: acc.physical + item.physical,
      reserved: acc.reserved + item.reserved,
      inCure: acc.inCure + item.inCure,
      blocked: acc.blocked + item.blocked,
      available: acc.available + item.available,
    }),
    { physical: 0, reserved: 0, inCure: 0, blocked: 0, available: 0 },
  );

  return {
    companyName: company.name,
    selectedLocationId,
    cards: {
      totalItems: inventoryItems.length,
      belowMinimum: inventoryItems.filter((item) => item.stockStatus === "below_minimum").length,
      physical: roundStock(totals.physical),
      reserved: roundStock(totals.reserved),
      inCure: roundStock(totals.inCure),
      blocked: roundStock(totals.blocked),
      available: roundStock(totals.available),
      locations: locationRows.filter((location) => location.isActive).length,
      movements: movementRows.length,
    },
    locations: locationRows,
    items: inventoryItems,
    movements: movementRows.map((movement) => ({
      id: movement.id,
      itemId: movement.itemId,
      itemCode: movement.itemCode,
      itemSku: movement.itemSku,
      itemName: movement.itemName,
      itemVariant: movement.itemVariant,
      movementType: movement.movementType,
      quantity: Number(movement.quantity),
      unit: movement.unit ?? "un",
      reason: movement.reason,
      sourceType: movement.sourceType,
      sourceId: movement.sourceId,
      occurredAt: movement.occurredAt.toISOString(),
      actorName: movement.actorName,
      fromLocation: movementLocation({
        id: movement.fromLocationId,
        code: movement.fromLocationCode,
        name: movement.fromLocationName,
        type: movement.fromLocationType,
      }),
      toLocation: movementLocation({
        id: movement.toLocationId,
        code: movement.toLocationCode,
        name: movement.toLocationName,
        type: movement.toLocationType,
      }),
    })),
  };
}
