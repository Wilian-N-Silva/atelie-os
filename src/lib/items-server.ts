import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, categories, inventoryLocations, items, units } from "@/db/schema";
import type { AppRouteContext } from "@/lib/app-route-context";
import {
  type CatalogItem,
  type ItemFormInput,
  type ItemLookups,
  type ItemsResponse,
  type ItemStatus,
  type ItemStockStatus,
  type ItemType,
} from "@/lib/items";
import { emptyStockBalance, getStockBalancesForCompany } from "@/lib/stock-balances";

const ITEM_TYPES: ItemType[] = ["raw_material", "packaging", "finished_good", "kit", "auxiliary"];
const ITEM_STATUSES: ItemStatus[] = ["active", "archived", "blocked"];

function numeric(value: string | null) {
  return value == null ? null : Number(value);
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function metadataNumber(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStockStatus(item: { min: number; available: number }): ItemStockStatus {
  if (item.min <= 0) return "no_minimum";
  return item.available < item.min ? "below_minimum" : "ok";
}

function cleanRequiredString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanOptionalString(value: unknown, max: number) {
  const cleaned = cleanRequiredString(value, max);
  return cleaned || null;
}

function cleanNonNegativeNumber(value: unknown, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : fallback;
}

function cleanNullableNumber(value: unknown) {
  if (value === null || value === "" || value === undefined) return null;
  const num = Number(value);
  return Number.isFinite(num) && num >= 0 ? num : null;
}

function cleanNullableInteger(value: unknown) {
  const num = cleanNullableNumber(value);
  return num == null ? null : Math.round(num);
}

function cleanNullableId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function cleanRequiredId(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function metadataFromInput(input: ItemFormInput) {
  const metadata: Record<string, unknown> = {};
  if (input.metadata.aroma) metadata.aroma = input.metadata.aroma;
  if (input.metadata.collection) metadata.collection = input.metadata.collection;
  if (input.metadata.cureDays != null) metadata.cureDays = input.metadata.cureDays;
  return metadata;
}

function itemValuesFromInput(input: ItemFormInput) {
  return {
    internalCode: input.internalCode,
    sku: input.sku,
    name: input.name,
    variant: input.variant,
    type: input.type,
    categoryId: input.categoryId,
    baseUnitId: input.baseUnitId,
    defaultLocationId: input.defaultLocationId,
    minStock: input.minStock.toString(),
    tracksLot: input.tracksLot,
    fragile: input.fragile,
    sellable: input.sellable,
    status: input.status,
    estimatedCost: input.estimatedCost == null ? null : input.estimatedCost.toString(),
    averageCost: input.averageCost == null ? null : input.averageCost.toString(),
    suggestedPrice: input.suggestedPrice == null ? null : input.suggestedPrice.toString(),
    currentPrice: input.currentPrice == null ? null : input.currentPrice.toString(),
    weightG: input.weightG,
    packedWeightG: input.packedWeightG,
    dimensions: input.dimensions,
    packedDimensions: input.packedDimensions,
    metadata: metadataFromInput(input),
    updatedAt: new Date(),
  };
}

export function parseItemInput(payload: unknown): { input: ItemFormInput } | { error: string } {
  if (!payload || typeof payload !== "object") return { error: "invalid_payload" };
  const data = payload as Record<string, unknown>;
  const metadata = data.metadata && typeof data.metadata === "object" ? data.metadata as Record<string, unknown> : {};
  const internalCode = cleanRequiredString(data.internalCode, 12);
  const sku = cleanRequiredString(data.sku, 64).toUpperCase();
  const name = cleanRequiredString(data.name, 160);
  const type = data.type;
  const status = data.status;
  const baseUnitId = cleanRequiredId(data.baseUnitId);

  if (!/^\d{12}$/.test(internalCode)) return { error: "invalid_internal_code" };
  if (!sku) return { error: "sku_required" };
  if (!name) return { error: "name_required" };
  if (!ITEM_TYPES.includes(type as ItemType)) return { error: "invalid_type" };
  if (!ITEM_STATUSES.includes(status as ItemStatus)) return { error: "invalid_status" };
  if (!baseUnitId) return { error: "unit_required" };

  return {
    input: {
      internalCode,
      sku,
      name,
      variant: cleanOptionalString(data.variant, 80),
      type: type as ItemType,
      categoryId: cleanNullableId(data.categoryId),
      baseUnitId,
      defaultLocationId: cleanNullableId(data.defaultLocationId),
      minStock: cleanNonNegativeNumber(data.minStock, 0),
      tracksLot: Boolean(data.tracksLot),
      fragile: Boolean(data.fragile),
      sellable: Boolean(data.sellable),
      status: status as ItemStatus,
      estimatedCost: cleanNullableNumber(data.estimatedCost),
      averageCost: cleanNullableNumber(data.averageCost),
      suggestedPrice: cleanNullableNumber(data.suggestedPrice),
      currentPrice: cleanNullableNumber(data.currentPrice),
      weightG: cleanNullableInteger(data.weightG),
      packedWeightG: cleanNullableInteger(data.packedWeightG),
      dimensions: cleanOptionalString(data.dimensions, 80),
      packedDimensions: cleanOptionalString(data.packedDimensions, 80),
      metadata: {
        aroma: cleanOptionalString(metadata.aroma, 240),
        collection: cleanOptionalString(metadata.collection, 80),
        cureDays: cleanNullableInteger(metadata.cureDays),
      },
    },
  };
}

export async function getItemLookups(companyId: string): Promise<ItemLookups> {
  const [categoryRows, unitRows, locationRows] = await Promise.all([
    db
      .select({ id: categories.id, name: categories.name, kind: categories.kind })
      .from(categories)
      .where(eq(categories.companyId, companyId))
      .orderBy(asc(categories.name)),
    db
      .select({ id: units.id, code: units.code, name: units.name, kind: units.kind })
      .from(units)
      .where(eq(units.companyId, companyId))
      .orderBy(asc(units.code)),
    db
      .select({ id: inventoryLocations.id, code: inventoryLocations.code, name: inventoryLocations.name, type: inventoryLocations.type })
      .from(inventoryLocations)
      .where(and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.isActive, true)))
      .orderBy(asc(inventoryLocations.name)),
  ]);

  return {
    categories: categoryRows,
    units: unitRows,
    locations: locationRows,
  };
}

export async function validateItemRelations(companyId: string, input: ItemFormInput) {
  const lookups = await getItemLookups(companyId);

  if (input.categoryId && !lookups.categories.some((category) => category.id === input.categoryId)) {
    return "invalid_category";
  }

  if (!lookups.units.some((unit) => unit.id === input.baseUnitId)) {
    return "invalid_unit";
  }

  if (input.defaultLocationId && !lookups.locations.some((location) => location.id === input.defaultLocationId)) {
    return "invalid_location";
  }

  return null;
}

export async function findDuplicateItem(companyId: string, input: ItemFormInput, currentItemId?: string) {
  const [skuDuplicate, codeDuplicate] = await Promise.all([
    db.query.items.findFirst({
      where: and(eq(items.companyId, companyId), eq(items.sku, input.sku)),
      columns: { id: true },
    }),
    db.query.items.findFirst({
      where: and(eq(items.companyId, companyId), eq(items.internalCode, input.internalCode)),
      columns: { id: true },
    }),
  ]);

  if (skuDuplicate && skuDuplicate.id !== currentItemId) return "sku_already_exists";
  if (codeDuplicate && codeDuplicate.id !== currentItemId) return "internal_code_already_exists";
  return null;
}

export async function buildItemsResponse(company: AppRouteContext["company"]): Promise<ItemsResponse> {
  const [itemRows, balances, lookups] = await Promise.all([
    db
      .select({
        id: items.id,
        code: items.internalCode,
        sku: items.sku,
        name: items.name,
        variant: items.variant,
        type: items.type,
        categoryId: items.categoryId,
        category: categories.name,
        baseUnitId: items.baseUnitId,
        unit: units.code,
        defaultLocationId: items.defaultLocationId,
        defaultLocation: inventoryLocations.name,
        minStock: items.minStock,
        estimatedCost: items.estimatedCost,
        averageCost: items.averageCost,
        suggestedPrice: items.suggestedPrice,
        currentPrice: items.currentPrice,
        weightG: items.weightG,
        packedWeightG: items.packedWeightG,
        dimensions: items.dimensions,
        packedDimensions: items.packedDimensions,
        fragile: items.fragile,
        sellable: items.sellable,
        tracksLot: items.tracksLot,
        status: items.status,
        metadata: items.metadata,
      })
      .from(items)
      .leftJoin(categories, eq(items.categoryId, categories.id))
      .leftJoin(units, eq(items.baseUnitId, units.id))
      .leftJoin(inventoryLocations, eq(items.defaultLocationId, inventoryLocations.id))
      .where(eq(items.companyId, company.id))
      .orderBy(asc(items.name), asc(items.variant)),
    getStockBalancesForCompany(company.id),
    getItemLookups(company.id),
  ]);

  const catalogItems = itemRows.map((row): CatalogItem => {
    const balance = balances.get(row.id) ?? emptyStockBalance();
    const min = Number(row.minStock);
    const item = {
      id: row.id,
      code: row.code,
      sku: row.sku,
      name: row.name,
      variant: row.variant,
      type: row.type,
      categoryId: row.categoryId,
      category: row.category,
      baseUnitId: row.baseUnitId,
      unit: row.unit ?? "un",
      defaultLocationId: row.defaultLocationId,
      defaultLocation: row.defaultLocation,
      min,
      physical: balance.physical,
      reserved: balance.reserved,
      inCure: balance.inCure,
      blocked: balance.blocked,
      available: balance.available,
      estimatedCost: numeric(row.estimatedCost),
      averageCost: numeric(row.averageCost),
      suggestedPrice: numeric(row.suggestedPrice),
      currentPrice: numeric(row.currentPrice),
      weightG: row.weightG,
      packedWeightG: row.packedWeightG,
      dimensions: row.dimensions,
      packedDimensions: row.packedDimensions,
      fragile: row.fragile,
      sellable: row.sellable,
      tracksLot: row.tracksLot,
      status: row.status,
      stockStatus: "ok" as ItemStockStatus,
      metadata: {
        aroma: metadataString(row.metadata, "aroma"),
        collection: metadataString(row.metadata, "collection"),
        cureDays: metadataNumber(row.metadata, "cureDays"),
      },
    };

    return {
      ...item,
      stockStatus: getStockStatus(item),
    };
  });

  return {
    companyName: company.name,
    cards: {
      total: catalogItems.length,
      active: catalogItems.filter((item) => item.status === "active").length,
      sellable: catalogItems.filter((item) => item.sellable).length,
      belowMinimum: catalogItems.filter((item) => item.stockStatus === "below_minimum").length,
      rawMaterials: catalogItems.filter((item) => item.type === "raw_material").length,
      packaging: catalogItems.filter((item) => item.type === "packaging").length,
      finishedGoods: catalogItems.filter((item) => item.type === "finished_good").length,
      kits: catalogItems.filter((item) => item.type === "kit").length,
    },
    lookups,
    items: catalogItems,
  };
}

export async function createCatalogItem(context: AppRouteContext, input: ItemFormInput) {
  const values = itemValuesFromInput(input);

  const [item] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(items)
      .values({
        ...values,
        companyId: context.company.id,
      })
      .returning({ id: items.id, code: items.internalCode });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "item.create",
      entityType: "item",
      entityId: created.id,
      metadata: {
        itemCode: input.internalCode,
        sku: input.sku,
        name: input.name,
        type: input.type,
      },
    });

    return [created];
  });

  return item;
}

export async function updateCatalogItem(context: AppRouteContext, itemId: string, input: ItemFormInput) {
  const before = await db.query.items.findFirst({
    where: and(eq(items.id, itemId), eq(items.companyId, context.company.id)),
  });

  if (!before) return null;

  const values = itemValuesFromInput(input);

  const [item] = await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(items)
      .set(values)
      .where(and(eq(items.id, itemId), eq(items.companyId, context.company.id)))
      .returning({ id: items.id, code: items.internalCode });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "item.update",
      entityType: "item",
      entityId: itemId,
      metadata: {
        previous: {
          itemCode: before.internalCode,
          sku: before.sku,
          name: before.name,
          type: before.type,
          status: before.status,
        },
        next: {
          itemCode: input.internalCode,
          sku: input.sku,
          name: input.name,
          type: input.type,
          status: input.status,
        },
      },
    });

    return [updated];
  });

  return item;
}
