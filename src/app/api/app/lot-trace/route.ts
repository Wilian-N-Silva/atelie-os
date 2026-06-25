import { NextResponse } from "next/server";
import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { items, productionOrders, stockMovements } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import {
  movementLineCost,
  summarizeLotTrace,
  type LotTraceMovement,
  type LotTraceMovementType,
  type LotTraceQuality,
} from "@/lib/lot-trace";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function movementType(sourceType: string | null, movementTypeValue: string): LotTraceMovementType | null {
  if (sourceType === "production.consumption") return "production_consumption";
  if (sourceType === "production.output") return "production_output";
  if (sourceType === "production.release") return "production_release";
  if (sourceType === "quality.loss") return "quality_loss";
  if (movementTypeValue === "production_consumption") return "production_consumption";
  if (movementTypeValue === "production_output") return "production_output";
  return null;
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const url = new URL(request.url);
  const productionId = cleanString(url.searchParams.get("productionId"), 80);
  if (!productionId) return NextResponse.json({ error: "production_id_required" }, { status: 400 });

  const production = await db.query.productionOrders.findFirst({
    where: and(eq(productionOrders.companyId, contextResult.context.company.id), eq(productionOrders.id, productionId)),
  });
  if (!production) return NextResponse.json({ error: "production_not_found" }, { status: 404 });

  const rows = await db
    .select({
      id: stockMovements.id,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      reason: stockMovements.reason,
      sourceType: stockMovements.sourceType,
      occurredAt: stockMovements.occurredAt,
      metadata: stockMovements.metadata,
      sku: items.sku,
      itemName: items.name,
      itemVariant: items.variant,
      averageCost: items.averageCost,
      estimatedCost: items.estimatedCost,
    })
    .from(stockMovements)
    .innerJoin(items, eq(stockMovements.itemId, items.id))
    .where(and(
      eq(stockMovements.companyId, contextResult.context.company.id),
      sql`${stockMovements.metadata}->>'productionId' = ${productionId}`,
    ))
    .orderBy(desc(stockMovements.occurredAt));

  const movements: LotTraceMovement[] = rows.flatMap((row) => {
    const type = movementType(row.sourceType, row.movementType);
    if (!type) return [];
    const metadata = row.metadata ?? {};
    const quantity = Number(row.quantity);
    const fallbackCost = numberOrNull(row.averageCost) ?? numberOrNull(row.estimatedCost);
    const unitCost = numberOrNull(metadata.unitCost) ?? fallbackCost;
    const lot = metadataString(metadata, "materialLot") ?? metadataString(metadata, "lot") ?? (type === "production_consumption" ? null : production.lot ?? null);
    return [{
      id: row.id,
      type,
      sku: row.sku,
      itemName: [row.itemName, row.itemVariant].filter(Boolean).join(" "),
      quantity: Number.isFinite(quantity) ? quantity : 0,
      lot,
      unitCost,
      lineCost: type === "production_consumption" ? movementLineCost(quantity, unitCost) : null,
      occurredAt: row.occurredAt.toISOString(),
      reason: row.reason,
    }];
  });

  const metadata = production.metadata ?? {};
  const quality = metadata.quality && typeof metadata.quality === "object" ? metadata.quality as LotTraceQuality : null;
  const trace = summarizeLotTrace({
    productionId: production.id,
    productionCode: production.code,
    productionNum: production.number,
    lot: production.lot ?? null,
    productName: production.productName,
    planned: Number(production.planned),
    status: production.status,
    quality,
    movements,
  });

  return NextResponse.json({ trace });
}
