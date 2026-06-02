import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs, items, stockMovements, units } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { emptyStockBalance, getStockBalancesForCompany, roundStock } from "@/lib/stock-balances";

export const runtime = "nodejs";

type AdjustmentDirection = "increase" | "decrease";

function jsonError(error: string, status: number) {
  return NextResponse.json({ error }, { status });
}

function parseAdjustmentPayload(payload: unknown): { direction: AdjustmentDirection; quantity: number; reason: string } | { error: string } {
  if (!payload || typeof payload !== "object") return { error: "invalid_payload" };

  const data = payload as Record<string, unknown>;
  const direction = data.direction;
  const quantity = Number(data.quantity);
  const reason = typeof data.reason === "string" ? data.reason.trim() : "";

  if (direction !== "increase" && direction !== "decrease") return { error: "invalid_direction" };
  if (!Number.isFinite(quantity) || quantity <= 0) return { error: "invalid_quantity" };
  if (!reason) return { error: "reason_required" };

  const roundedQuantity = roundStock(quantity);
  if (roundedQuantity <= 0) return { error: "invalid_quantity" };

  return {
    direction,
    quantity: roundedQuantity,
    reason: reason.slice(0, 500),
  };
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const { itemId } = await params;
  const parsed = parseAdjustmentPayload(await request.json().catch(() => null));

  if ("error" in parsed) return jsonError(parsed.error, 400);

  const [item] = await db
    .select({
      id: items.id,
      code: items.internalCode,
      sku: items.sku,
      name: items.name,
      defaultLocationId: items.defaultLocationId,
      unit: units.code,
    })
    .from(items)
    .leftJoin(units, eq(items.baseUnitId, units.id))
    .where(and(eq(items.id, itemId), eq(items.companyId, context.company.id)))
    .limit(1);

  if (!item) return jsonError("item_not_found", 404);

  const balances = await getStockBalancesForCompany(context.company.id);
  const balance = balances.get(item.id) ?? emptyStockBalance();

  if (parsed.direction === "decrease" && parsed.quantity > balance.physical) {
    return jsonError("insufficient_physical_stock", 409);
  }

  const movementType = parsed.direction === "increase" ? "adjustment_positive" : "adjustment_negative";
  const adjustmentId = randomUUID();
  const nextPhysical = roundStock(balance.physical + (parsed.direction === "increase" ? parsed.quantity : -parsed.quantity));

  const movement = await db.transaction(async (tx) => {
    const [insertedMovement] = await tx
      .insert(stockMovements)
      .values({
        companyId: context.company.id,
        itemId: item.id,
        movementType,
        quantity: parsed.quantity.toString(),
        fromLocationId: parsed.direction === "decrease" ? item.defaultLocationId : null,
        toLocationId: parsed.direction === "increase" ? item.defaultLocationId : null,
        reason: parsed.reason,
        sourceType: "manual.stock_adjustment",
        sourceId: adjustmentId,
        createdByUserId: context.user.id,
        metadata: {
          direction: parsed.direction,
          previousPhysical: balance.physical,
          previousAvailable: balance.available,
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
        adjustmentId,
        movementId: insertedMovement?.id,
        itemCode: item.code,
        sku: item.sku,
        itemName: item.name,
        movementType,
        quantity: parsed.quantity,
        unit: item.unit ?? "un",
        reason: parsed.reason,
        previousPhysical: balance.physical,
        nextPhysical,
      },
    });

    return insertedMovement;
  });

  return NextResponse.json({
    ok: true,
    movementId: movement?.id,
    itemId: item.id,
    physical: nextPhysical,
  });
}
