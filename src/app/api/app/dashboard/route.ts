import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  inventoryLocations,
  items,
  stockMovements,
  units,
} from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import type { DashboardResponse, DashboardStockItem } from "@/lib/dashboard";

export const runtime = "nodejs";

type StockBalance = Pick<DashboardStockItem, "physical" | "reserved" | "inCure" | "blocked" | "available">;
type StockMovementType = (typeof stockMovements.$inferSelect)["movementType"];

function emptyBalance(): StockBalance {
  return {
    physical: 0,
    reserved: 0,
    inCure: 0,
    blocked: 0,
    available: 0,
  };
}

function roundStock(value: number) {
  return Math.round(value * 1000) / 1000;
}

function addMovement(balance: StockBalance, movement: {
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

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;

  const [itemRows, movementRows] = await Promise.all([
    db
      .select({
        id: items.id,
        internalCode: items.internalCode,
        sku: items.sku,
        name: items.name,
        variant: items.variant,
        minStock: items.minStock,
        unit: units.code,
      })
      .from(items)
      .leftJoin(units, eq(items.baseUnitId, units.id))
      .where(eq(items.companyId, context.company.id)),
    db
      .select({
        itemId: stockMovements.itemId,
        type: stockMovements.movementType,
        quantity: stockMovements.quantity,
        toLocationType: inventoryLocations.type,
      })
      .from(stockMovements)
      .leftJoin(inventoryLocations, eq(stockMovements.toLocationId, inventoryLocations.id))
      .innerJoin(items, and(eq(stockMovements.itemId, items.id), eq(items.companyId, context.company.id)))
      .where(eq(stockMovements.companyId, context.company.id)),
  ]);

  const balances = new Map<string, StockBalance>();

  for (const movement of movementRows) {
    const balance = balances.get(movement.itemId) ?? emptyBalance();
    addMovement(balance, movement);
    balance.available = balance.physical - balance.reserved - balance.inCure - balance.blocked;
    balances.set(movement.itemId, balance);
  }

  const stockItems = itemRows.map((item): DashboardStockItem => {
    const balance = balances.get(item.id) ?? emptyBalance();

    return {
      id: item.id,
      code: item.internalCode,
      sku: item.sku,
      name: item.name,
      variant: item.variant,
      unit: item.unit ?? "un",
      min: Number(item.minStock),
      physical: roundStock(balance.physical),
      reserved: roundStock(balance.reserved),
      inCure: roundStock(balance.inCure),
      blocked: roundStock(balance.blocked),
      available: roundStock(balance.physical - balance.reserved - balance.inCure - balance.blocked),
    };
  });

  const totals = stockItems.reduce(
    (acc, item) => ({
      physical: acc.physical + item.physical,
      reserved: acc.reserved + item.reserved,
      inCure: acc.inCure + item.inCure,
      blocked: acc.blocked + item.blocked,
      available: acc.available + item.available,
    }),
    { physical: 0, reserved: 0, inCure: 0, blocked: 0, available: 0 },
  );

  const lowStock = stockItems
    .filter((item) => item.min > 0 && item.available < item.min)
    .sort((a, b) => (a.available - a.min) - (b.available - b.min));

  const response: DashboardResponse = {
    companyName: context.company.name,
    cards: {
      belowMinimum: lowStock.length,
      reservedUnits: roundStock(totals.reserved),
      inCureUnits: roundStock(totals.inCure),
      blockedUnits: roundStock(totals.blocked),
    },
    alerts: lowStock.slice(0, 10).map((item) => ({
      id: `low-stock-${item.id}`,
      group: "estoque",
      severity: item.available <= 0 ? "critical" : "warning",
      title: `${item.name}${item.variant ? ` ${item.variant}` : ""} abaixo do minimo`,
      desc: `${item.available} ${item.unit} disponivel - minimo ${item.min}`,
      action: { screen: "itens", open: item.code },
    })),
    stockSummary: {
      totalItems: stockItems.length,
      belowMinimum: lowStock.length,
      totals: {
        physical: roundStock(totals.physical),
        reserved: roundStock(totals.reserved),
        inCure: roundStock(totals.inCure),
        blocked: roundStock(totals.blocked),
        available: roundStock(totals.available),
      },
      lowStock,
    },
  };

  return NextResponse.json(response);
}
