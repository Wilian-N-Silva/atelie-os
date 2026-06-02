import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { categories, inventoryLocations, items, units } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { emptyStockBalance, getStockBalancesForCompany } from "@/lib/stock-balances";
import type { CatalogItem, ItemsResponse, ItemStockStatus } from "@/lib/items";

export const runtime = "nodejs";

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

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;

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
      .where(eq(items.companyId, context.company.id))
      .orderBy(asc(items.name), asc(items.variant)),
    getStockBalancesForCompany(context.company.id),
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
      category: row.category,
      unit: row.unit ?? "un",
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

  const response: ItemsResponse = {
    companyName: context.company.name,
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
    items: catalogItems,
  };

  return NextResponse.json(response);
}
