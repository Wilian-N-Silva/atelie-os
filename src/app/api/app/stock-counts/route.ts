import { NextResponse } from "next/server";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, inventoryLocations, items, stockCountItems, stockCounts, stockMovements } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { emptyStockBalance, getStockBalancesForCompany } from "@/lib/stock-balances";
import { countSummary, stockCountAdjustments, type StockCountLine } from "@/lib/stock-count";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

type CountItemRow = {
  itemId: string;
  sku: string;
  name: string;
  expected: number;
  counted: number | null;
  lossReason: string;
};

async function listActiveLocations(companyId: string) {
  return db
    .select({
      id: inventoryLocations.id,
      code: inventoryLocations.code,
      name: inventoryLocations.name,
      type: inventoryLocations.type,
    })
    .from(inventoryLocations)
    .where(and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.isActive, true)))
    .orderBy(asc(inventoryLocations.name));
}

async function countDetail(companyId: string, countId: string) {
  const [count] = await db
    .select()
    .from(stockCounts)
    .where(and(eq(stockCounts.companyId, companyId), eq(stockCounts.id, countId)))
    .limit(1);
  if (!count) return null;

  const rows = await db
    .select({
      itemId: stockCountItems.itemId,
      sku: stockCountItems.sku,
      name: stockCountItems.name,
      expectedQty: stockCountItems.expectedQty,
      countedQty: stockCountItems.countedQty,
      lossReason: stockCountItems.lossReason,
    })
    .from(stockCountItems)
    .where(eq(stockCountItems.countId, countId))
    .orderBy(stockCountItems.name);

  const lines: CountItemRow[] = rows.map((row) => ({
    itemId: row.itemId,
    sku: row.sku,
    name: row.name,
    expected: toNumber(row.expectedQty) ?? 0,
    counted: toNumber(row.countedQty),
    lossReason: row.lossReason,
  }));

  const [location] = count.locationId
    ? await db
        .select({
          id: inventoryLocations.id,
          code: inventoryLocations.code,
          name: inventoryLocations.name,
          type: inventoryLocations.type,
        })
        .from(inventoryLocations)
        .where(and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.id, count.locationId)))
        .limit(1)
    : [null];

  return {
    id: count.id,
    code: count.code,
    status: count.status,
    note: count.note,
    locationId: count.locationId,
    location,
    createdAt: count.createdAt ? count.createdAt.toISOString() : null,
    appliedAt: count.appliedAt ? count.appliedAt.toISOString() : null,
    summary: countSummary(lines),
    items: lines,
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const id = cleanString(new URL(request.url).searchParams.get("id"), 80);
  if (id) {
    const detail = await countDetail(context.company.id, id);
    if (!detail) return NextResponse.json({ error: "count_not_found" }, { status: 404 });
    return NextResponse.json({ count: detail });
  }

  const counts = await db
    .select({
      id: stockCounts.id,
      code: stockCounts.code,
      status: stockCounts.status,
      locationId: stockCounts.locationId,
      createdAt: stockCounts.createdAt,
      appliedAt: stockCounts.appliedAt,
      locationName: inventoryLocations.name,
      locationCode: inventoryLocations.code,
      locationType: inventoryLocations.type,
    })
    .from(stockCounts)
    .leftJoin(inventoryLocations, eq(stockCounts.locationId, inventoryLocations.id))
    .where(eq(stockCounts.companyId, context.company.id))
    .orderBy(desc(stockCounts.createdAt));

  const countIds = counts.map((count) => count.id);
  const itemRows = countIds.length
    ? await db
        .select({ countId: stockCountItems.countId, expectedQty: stockCountItems.expectedQty, countedQty: stockCountItems.countedQty })
        .from(stockCountItems)
        .where(inArray(stockCountItems.countId, countIds))
    : [];

  const byCount = new Map<string, StockCountLine[]>();
  for (const row of itemRows) {
    const list = byCount.get(row.countId) ?? [];
    list.push({ itemId: "", sku: "", expected: toNumber(row.expectedQty) ?? 0, counted: toNumber(row.countedQty) });
    byCount.set(row.countId, list);
  }

  return NextResponse.json({
    locations: await listActiveLocations(context.company.id),
    counts: counts.map((count) => ({
      id: count.id,
      code: count.code,
      status: count.status,
      locationId: count.locationId,
      location: count.locationId
        ? { id: count.locationId, code: count.locationCode ?? "", name: count.locationName ?? "", type: count.locationType ?? "" }
        : null,
      createdAt: count.createdAt ? count.createdAt.toISOString() : null,
      appliedAt: count.appliedAt ? count.appliedAt.toISOString() : null,
      summary: countSummary(byCount.get(count.id) ?? []),
    })),
  });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { note?: unknown; locationId?: unknown } | null;
  const requestedLocationId = cleanString(body?.locationId, 80);
  const locations = await listActiveLocations(context.company.id);
  const locationId = requestedLocationId && locations.some((location) => location.id === requestedLocationId)
    ? requestedLocationId
    : null;

  const [activeItems, balances, existing] = await Promise.all([
    db
      .select({ id: items.id, sku: items.sku, name: items.name, variant: items.variant })
      .from(items)
      .where(and(eq(items.companyId, context.company.id), eq(items.status, "active")))
      .orderBy(items.name),
    getStockBalancesForCompany(context.company.id, locationId),
    db.select({ id: stockCounts.id }).from(stockCounts).where(eq(stockCounts.companyId, context.company.id)),
  ]);

  if (!activeItems.length) return NextResponse.json({ error: "no_items_to_count" }, { status: 409 });

  const code = `CONT-${String(existing.length + 1).padStart(4, "0")}`;

  const countId = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(stockCounts)
      .values({
        companyId: context.company.id,
        code,
        locationId,
        note: cleanString(body?.note, 240),
        createdByUserId: context.user.id,
      })
      .returning({ id: stockCounts.id });

    await tx.insert(stockCountItems).values(activeItems.map((item) => ({
      countId: created.id,
      itemId: item.id,
      sku: item.sku,
      name: [item.name, item.variant].filter(Boolean).join(" ").trim() || item.sku,
      expectedQty: ((balances.get(item.id) ?? emptyStockBalance()).physical).toString(),
    })));

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "stock.adjust",
      entityType: "stock_count",
      entityId: created.id,
      metadata: { code, locationId, operation: "count_create", items: activeItems.length },
    });

    return created.id;
  });

  return NextResponse.json({ count: await countDetail(context.company.id, countId) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { countId?: unknown; action?: unknown; items?: unknown } | null;
  const countId = cleanString(body?.countId, 80);
  const action = body?.action === "apply" || body?.action === "cancel" ? body.action : "save";
  if (!countId) return NextResponse.json({ error: "invalid_count" }, { status: 400 });

  const [count] = await db
    .select({ id: stockCounts.id, code: stockCounts.code, status: stockCounts.status, locationId: stockCounts.locationId })
    .from(stockCounts)
    .where(and(eq(stockCounts.companyId, context.company.id), eq(stockCounts.id, countId)))
    .limit(1);
  if (!count) return NextResponse.json({ error: "count_not_found" }, { status: 404 });
  if (count.status !== "aberta") return NextResponse.json({ error: "count_not_open" }, { status: 409 });

  if (action === "cancel") {
    await db.update(stockCounts).set({ status: "cancelada", updatedAt: new Date() }).where(eq(stockCounts.id, countId));
    return NextResponse.json({ count: await countDetail(context.company.id, countId) });
  }

  if (action === "save") {
    const updates = Array.isArray(body?.items) ? body.items : [];
    await db.transaction(async (tx) => {
      for (const entry of updates) {
        if (!entry || typeof entry !== "object") continue;
        const itemId = cleanString((entry as Record<string, unknown>).itemId, 80);
        if (!itemId) continue;
        const record = entry as Record<string, unknown>;
        const countedRaw = record.countedQty;
        const counted = countedRaw == null || countedRaw === "" ? null : toNumber(countedRaw);
        const lossReason = cleanString(record.lossReason, 40);
        await tx
          .update(stockCountItems)
          .set({
            countedQty: counted == null ? null : Math.max(0, counted).toString(),
            lossReason,
            updatedAt: new Date(),
          })
          .where(and(eq(stockCountItems.countId, countId), eq(stockCountItems.itemId, itemId)));
      }
    });
    return NextResponse.json({ count: await countDetail(context.company.id, countId) });
  }

  // apply: turn divergences into stock adjustments after confirmation.
  const rows = await db
    .select({
      itemId: stockCountItems.itemId,
      sku: stockCountItems.sku,
      expectedQty: stockCountItems.expectedQty,
      countedQty: stockCountItems.countedQty,
      lossReason: stockCountItems.lossReason,
      defaultLocationId: items.defaultLocationId,
    })
    .from(stockCountItems)
    .leftJoin(items, eq(stockCountItems.itemId, items.id))
    .where(eq(stockCountItems.countId, countId));

  const locationByItem = new Map(rows.map((row) => [row.itemId, row.defaultLocationId]));
  const adjustments = stockCountAdjustments(rows.map((row) => ({
    itemId: row.itemId,
    sku: row.sku,
    expected: toNumber(row.expectedQty) ?? 0,
    counted: toNumber(row.countedQty),
    lossReason: row.lossReason,
  })));
  const missingLossReason = adjustments.find((adjustment) => adjustment.direction === "decrease" && !adjustment.lossReason);
  if (missingLossReason) return NextResponse.json({ error: "loss_reason_required", sku: missingLossReason.sku }, { status: 409 });

  await db.transaction(async (tx) => {
    for (const adjustment of adjustments) {
      const locationId = count.locationId ?? locationByItem.get(adjustment.itemId) ?? null;
      await tx.insert(stockMovements).values({
        companyId: context.company.id,
        itemId: adjustment.itemId,
        movementType: adjustment.direction === "increase" ? "adjustment_positive" : "adjustment_negative",
        quantity: adjustment.quantity.toString(),
        fromLocationId: adjustment.direction === "decrease" ? locationId : null,
        toLocationId: adjustment.direction === "increase" ? locationId : null,
        reason: adjustment.direction === "decrease" && adjustment.lossReason
          ? `Ajuste de contagem ${count.code} - ${adjustment.lossReason}`
          : `Ajuste de contagem ${count.code}`,
        sourceType: "stock_count",
        sourceId: `${countId}:${adjustment.itemId}`,
        createdByUserId: context.user.id,
        metadata: { countId, sku: adjustment.sku, locationId, lossReason: adjustment.lossReason || null },
      });
    }

    await tx.update(stockCounts).set({
      status: "ajustada",
      appliedByUserId: context.user.id,
      appliedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(stockCounts.id, countId));

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "stock.adjust",
      entityType: "stock_count",
      entityId: countId,
      metadata: { code: count.code, operation: "count_apply", adjustments: adjustments.length },
    });
  });

  return NextResponse.json({ count: await countDetail(context.company.id, countId), adjustments: adjustments.length });
}
