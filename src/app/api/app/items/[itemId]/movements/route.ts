import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { items, stockMovements, units, user } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import type { ItemMovementsResponse } from "@/lib/items";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const { itemId } = await params;

  const [item] = await db
    .select({
      id: items.id,
      unit: units.code,
    })
    .from(items)
    .leftJoin(units, eq(items.baseUnitId, units.id))
    .where(and(eq(items.id, itemId), eq(items.companyId, context.company.id)))
    .limit(1);

  if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  const movementRows = await db
    .select({
      id: stockMovements.id,
      movementType: stockMovements.movementType,
      quantity: stockMovements.quantity,
      reason: stockMovements.reason,
      sourceType: stockMovements.sourceType,
      sourceId: stockMovements.sourceId,
      occurredAt: stockMovements.occurredAt,
      actorName: user.name,
    })
    .from(stockMovements)
    .leftJoin(user, eq(stockMovements.createdByUserId, user.id))
    .where(and(eq(stockMovements.companyId, context.company.id), eq(stockMovements.itemId, item.id)))
    .orderBy(desc(stockMovements.occurredAt))
    .limit(30);

  const response: ItemMovementsResponse = {
    itemId: item.id,
    movements: movementRows.map((movement) => ({
      id: movement.id,
      movementType: movement.movementType,
      quantity: Number(movement.quantity),
      unit: item.unit ?? "un",
      reason: movement.reason,
      sourceType: movement.sourceType,
      sourceId: movement.sourceId,
      occurredAt: movement.occurredAt.toISOString(),
      actorName: movement.actorName,
    })),
  };

  return NextResponse.json(response);
}
