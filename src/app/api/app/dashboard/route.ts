import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import {
  items,
  units,
} from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import type { DashboardResponse, DashboardStockItem } from "@/lib/dashboard";
import { emptyStockBalance, getStockBalancesForCompany, roundStock } from "@/lib/stock-balances";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;

  const [itemRows, balances] = await Promise.all([
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
    getStockBalancesForCompany(context.company.id),
  ]);

  const stockItems = itemRows.map((item): DashboardStockItem => {
    const balance = balances.get(item.id) ?? emptyStockBalance();

    return {
      id: item.id,
      code: item.internalCode,
      sku: item.sku,
      name: item.name,
      variant: item.variant,
      unit: item.unit ?? "un",
      min: Number(item.minStock),
      physical: balance.physical,
      reserved: balance.reserved,
      inCure: balance.inCure,
      blocked: balance.blocked,
      available: balance.available,
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
