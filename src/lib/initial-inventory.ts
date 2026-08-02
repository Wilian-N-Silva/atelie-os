import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import {
  auditLogs,
  categories,
  items,
  recipeComponents,
  recipes,
  recipeVersions,
  stockMovements,
  units,
  inventoryLocations,
} from "@/db/schema";
import type { AppRouteContext } from "@/lib/app-route-context";
import type { InitialInventoryInput, ItemType } from "@/lib/initial-inventory-utils";
export {
  calculateInitialTotalCost,
  calculateInitialUnitCost,
  parseInitialInventoryPayload,
} from "@/lib/initial-inventory-utils";

const TYPE_PREFIX: Record<ItemType, string> = {
  raw_material: "0101",
  packaging: "0102",
  finished_good: "0103",
  kit: "0104",
  auxiliary: "0105",
};

export type InitialInventoryResult = {
  itemsCreated: number;
  itemsUpdated: number;
  movementsCreated: number;
  recipesCreated: number;
};

function checkDigit(base11: string) {
  const sum = base11.split("").reduce((acc, digit, index) => acc + Number(digit) * (index % 2 === 0 ? 3 : 1), 0);
  return String((10 - (sum % 10)) % 10);
}

function internalCode(prefix: string, sequence: number) {
  const base = `${prefix}${String(sequence).padStart(7, "0")}`.slice(0, 11);
  return `${base}${checkDigit(base)}`;
}

async function validateLookups(companyId: string, input: InitialInventoryInput) {
  const [unitRows, categoryRows, locationRows] = await Promise.all([
    db.query.units.findMany({ where: eq(units.companyId, companyId), columns: { id: true } }),
    db.query.categories.findMany({ where: eq(categories.companyId, companyId), columns: { id: true } }),
    db.query.inventoryLocations.findMany({ where: eq(inventoryLocations.companyId, companyId), columns: { id: true, isActive: true } }),
  ]);
  const unitIds = new Set(unitRows.map((row) => row.id));
  const categoryIds = new Set(categoryRows.map((row) => row.id));
  const locationIds = new Set(locationRows.filter((row) => row.isActive).map((row) => row.id));

  for (const item of input.items) {
    if (!unitIds.has(item.baseUnitId)) return "invalid_unit";
    if (item.categoryId && !categoryIds.has(item.categoryId)) return "invalid_category";
    if (item.defaultLocationId && !locationIds.has(item.defaultLocationId)) return "invalid_location";
    if (item.quantity > 0 && !item.defaultLocationId) return "location_required_for_quantity";
  }
  return null;
}

async function codeSeeds(companyId: string) {
  const rows = await db.query.items.findMany({
    where: eq(items.companyId, companyId),
    columns: { internalCode: true },
  });
  const seeds = new Map<string, number>();
  for (const row of rows) {
    const prefix = row.internalCode.slice(0, 4);
    const sequence = Number(row.internalCode.slice(4, 11));
    if (Number.isFinite(sequence)) seeds.set(prefix, Math.max(seeds.get(prefix) ?? 0, sequence));
  }
  return seeds;
}

export async function applyInitialInventory(context: AppRouteContext, input: InitialInventoryInput) {
  const lookupError = await validateLookups(context.company.id, input);
  if (lookupError) return { error: lookupError };

  const skus = Array.from(new Set([...input.items.map((item) => item.sku), ...input.recipes.flatMap((recipe) => [recipe.productSku, ...recipe.components.map((component) => component.sku)])]));
  const existingItems = skus.length
    ? await db.query.items.findMany({
        where: and(eq(items.companyId, context.company.id), inArray(items.sku, skus)),
        columns: { id: true, sku: true, internalCode: true },
      })
    : [];
  const itemBySku = new Map(existingItems.map((item) => [item.sku, item]));
  const sequences = await codeSeeds(context.company.id);
  const batchId = randomUUID();

  const result: InitialInventoryResult = await db.transaction(async (tx) => {
    let itemsCreated = 0;
    let itemsUpdated = 0;
    let movementsCreated = 0;
    let recipesCreated = 0;

    for (const entry of input.items) {
      const cost = entry.unitCost;
      let item = itemBySku.get(entry.sku);
      if (!item) {
        const prefix = TYPE_PREFIX[entry.type];
        const next = (sequences.get(prefix) ?? 0) + 1;
        sequences.set(prefix, next);
        const [created] = await tx.insert(items).values({
          companyId: context.company.id,
          internalCode: internalCode(prefix, next),
          sku: entry.sku,
          name: entry.name,
          type: entry.type,
          categoryId: entry.categoryId,
          baseUnitId: entry.baseUnitId,
          defaultLocationId: entry.defaultLocationId,
          minStock: entry.minStock.toString(),
          tracksLot: entry.tracksLot,
          sellable: entry.sellable,
          currentPrice: entry.currentPrice == null ? null : entry.currentPrice.toString(),
          estimatedCost: cost == null ? null : cost.toString(),
          averageCost: cost == null ? null : cost.toString(),
          status: "active",
          metadata: { initialInventory: true },
        }).returning({ id: items.id, sku: items.sku, internalCode: items.internalCode });
        item = created;
        itemBySku.set(entry.sku, item);
        itemsCreated += 1;
      } else {
        const updateValues: Partial<typeof items.$inferInsert> = {
          name: entry.name,
          type: entry.type,
          categoryId: entry.categoryId,
          baseUnitId: entry.baseUnitId,
          defaultLocationId: entry.defaultLocationId,
          minStock: entry.minStock.toString(),
          tracksLot: entry.tracksLot,
          sellable: entry.sellable,
          currentPrice: entry.currentPrice == null ? null : entry.currentPrice.toString(),
          updatedAt: new Date(),
        };
        if (cost != null) {
          updateValues.averageCost = cost.toString();
          updateValues.estimatedCost = cost.toString();
        }
        await tx.update(items).set(updateValues).where(eq(items.id, item.id));
        itemsUpdated += 1;
      }

      if (entry.quantity > 0 && entry.defaultLocationId) {
        await tx.insert(stockMovements).values({
          companyId: context.company.id,
          itemId: item.id,
          movementType: "purchase_entry",
          quantity: entry.quantity.toString(),
          toLocationId: entry.defaultLocationId,
          reason: "Estoque inicial",
          sourceType: "initial_stock",
          sourceId: `${batchId}:${entry.sku}`,
          createdByUserId: context.user.id,
          metadata: {
            initialEntry: true,
            batchId,
            unitCost: entry.unitCost,
            totalCost: entry.totalCost,
            lot: entry.lot,
            expiresAt: entry.expiresAt,
          },
        });
        movementsCreated += 1;
      }
    }

    for (const recipe of input.recipes) {
      const [createdRecipe] = await tx.insert(recipes).values({
        companyId: context.company.id,
        name: recipe.name,
        productItemId: itemBySku.get(recipe.productSku)?.id ?? null,
        productSku: recipe.productSku,
        productName: recipe.productName,
        createdByUserId: context.user.id,
      }).returning({ id: recipes.id });
      const [version] = await tx.insert(recipeVersions).values({
        recipeId: createdRecipe.id,
        version: "v1",
        status: "rascunho",
        yieldQty: recipe.yieldQty.toString(),
        yieldUnit: recipe.yieldUnit,
        cureDays: recipe.cureDays,
      }).returning({ id: recipeVersions.id });
      await tx.insert(recipeComponents).values(recipe.components.map((component, index) => ({
        recipeVersionId: version.id,
        itemId: itemBySku.get(component.sku)?.id ?? null,
        sku: component.sku,
        name: component.name,
        quantity: component.qty.toString(),
        unit: component.unit,
        loss: component.loss.toString(),
        position: index,
      })));
      recipesCreated += 1;
    }

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "seed.run",
      entityType: "initial_inventory",
      entityId: batchId,
      metadata: { itemsCreated, itemsUpdated, movementsCreated, recipesCreated },
    });

    return { itemsCreated, itemsUpdated, movementsCreated, recipesCreated };
  });

  return { ok: true as const, ...result };
}
