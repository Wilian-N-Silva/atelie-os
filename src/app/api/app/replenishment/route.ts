import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { items, orderItems, orders, productionOrders, recipeComponents, recipeVersions, units } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { emptyStockBalance, getStockBalancesForCompany } from "@/lib/stock-balances";
import {
  buildReplenishmentPlan,
  shouldShowReplenishment,
  type ReplenishmentSuggestion,
} from "@/lib/replenishment";
import { convertQuantityOrSame } from "@/lib/unit-conversion";

export const runtime = "nodejs";

const CLOSED_ORDER_STATUSES = new Set(["enviado", "entregue", "cancelado"]);
const CLOSED_PRODUCTION_STATUSES = new Set(["liberada", "finalizada", "cancelada"]);

function addDemand(map: Map<string, number>, itemId: string | null | undefined, quantity: unknown) {
  if (!itemId) return;
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) return;
  map.set(itemId, Math.round(((map.get(itemId) ?? 0) + qty) * 1000) / 1000);
}

async function openOrderDemand(companyId: string) {
  const demand = new Map<string, number>();
  const rows = await db
    .select({
      itemId: orderItems.itemId,
      quantity: orderItems.quantity,
      status: orders.status,
    })
    .from(orderItems)
    .innerJoin(orders, eq(orderItems.orderId, orders.id))
    .where(eq(orders.companyId, companyId));

  for (const row of rows) {
    if (CLOSED_ORDER_STATUSES.has(row.status)) continue;
    addDemand(demand, row.itemId, row.quantity);
  }
  return demand;
}

async function openProductionDemand(companyId: string) {
  const demand = new Map<string, number>();
  const productionRows = await db.query.productionOrders.findMany({
    where: eq(productionOrders.companyId, companyId),
    columns: { id: true, status: true, recipeVersionId: true, planned: true },
  });

  const openRows = productionRows.filter((row) => row.recipeVersionId && !CLOSED_PRODUCTION_STATUSES.has(row.status));
  for (const production of openRows) {
    const version = await db.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, production.recipeVersionId as string),
      columns: { yieldQty: true },
    });
    const components = await db.query.recipeComponents.findMany({
      where: eq(recipeComponents.recipeVersionId, production.recipeVersionId as string),
      columns: { itemId: true, quantity: true, unit: true, loss: true },
    });
    const planned = Number(production.planned);
    const yieldQty = Number(version?.yieldQty ?? 1) || 1;
    const multiplier = planned / yieldQty;

    for (const component of components) {
      const baseQty = Number(component.quantity);
      const lossPct = Number(component.loss);
      const item = component.itemId
        ? await db.query.items.findFirst({
          where: eq(items.id, component.itemId),
          columns: { baseUnitId: true },
        })
        : null;
      const itemUnit = item?.baseUnitId
        ? await db.query.units.findFirst({
          where: eq(units.id, item.baseUnitId),
          columns: { code: true },
        })
        : null;
      const convertedBaseQty = convertQuantityOrSame(baseQty, component.unit, itemUnit?.code);
      const quantity = convertedBaseQty * multiplier * (1 + (Number.isFinite(lossPct) ? lossPct : 0) / 100);
      addDemand(demand, component.itemId, quantity);
    }
  }
  return demand;
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const [itemRows, balances, orderDemand, productionDemand] = await Promise.all([
    db
      .select({
        id: items.id,
        code: items.internalCode,
        sku: items.sku,
        name: items.name,
        variant: items.variant,
        type: items.type,
        minStock: items.minStock,
        unit: units.code,
      })
      .from(items)
      .leftJoin(units, eq(items.baseUnitId, units.id))
      .where(eq(items.companyId, context.company.id)),
    getStockBalancesForCompany(context.company.id),
    openOrderDemand(context.company.id),
    openProductionDemand(context.company.id),
  ]);

  const suggestions = itemRows.flatMap((item): ReplenishmentSuggestion[] => {
    const balance = balances.get(item.id) ?? emptyStockBalance();
    const input = {
      available: balance.available,
      minStock: Number(item.minStock),
      orderDemand: orderDemand.get(item.id) ?? 0,
      productionDemand: productionDemand.get(item.id) ?? 0,
    };
    const plan = buildReplenishmentPlan(input);
    if (!shouldShowReplenishment(plan, input)) return [];

    return [{
      ...plan,
      itemId: item.id,
      sku: item.sku,
      code: item.code,
      name: item.name,
      variant: item.variant,
      type: item.type,
      unit: item.unit ?? "un",
      physical: balance.physical,
      reserved: balance.reserved,
      inCure: balance.inCure,
      blocked: balance.blocked,
      available: balance.available,
      minStock: input.minStock,
      orderDemand: input.orderDemand,
      productionDemand: input.productionDemand,
    }];
  }).sort((left, right) => {
    const priority = { critical: 0, warning: 1, watch: 2 };
    return priority[left.priority] - priority[right.priority]
      || right.suggestedQty - left.suggestedQty
      || left.name.localeCompare(right.name, "pt-BR");
  });

  const totals = suggestions.reduce(
    (acc, item) => ({
      critical: acc.critical + (item.priority === "critical" ? 1 : 0),
      warning: acc.warning + (item.priority === "warning" ? 1 : 0),
      suggestedQty: acc.suggestedQty + item.suggestedQty,
      orderDemand: acc.orderDemand + item.orderDemand,
      productionDemand: acc.productionDemand + item.productionDemand,
    }),
    { critical: 0, warning: 0, suggestedQty: 0, orderDemand: 0, productionDemand: 0 },
  );

  return NextResponse.json({
    suggestions,
    totals: {
      ...totals,
      suggestedQty: Math.round(totals.suggestedQty * 1000) / 1000,
      orderDemand: Math.round(totals.orderDemand * 1000) / 1000,
      productionDemand: Math.round(totals.productionDemand * 1000) / 1000,
    },
  });
}
