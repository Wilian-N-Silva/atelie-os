import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { items, stockMovements } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { summarizeMaterialLotOptions } from "@/lib/material-lots";

export const runtime = "nodejs";

function cleanIdList(value: string | null) {
  return Array.from(new Set((value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 80)));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const url = new URL(request.url);
  const itemIds = cleanIdList(url.searchParams.get("itemIds"));
  if (!itemIds.length) return NextResponse.json({ lots: [] });

  const companyId = contextResult.context.company.id;
  const ownedItems = await db.query.items.findMany({
    where: and(eq(items.companyId, companyId), inArray(items.id, itemIds)),
    columns: { id: true },
  });
  const ownedIds = ownedItems.map((item) => item.id);
  if (!ownedIds.length) return NextResponse.json({ lots: [] });

  const movements = await db.query.stockMovements.findMany({
    where: and(eq(stockMovements.companyId, companyId), inArray(stockMovements.itemId, ownedIds)),
    columns: {
      itemId: true,
      movementType: true,
      quantity: true,
      metadata: true,
      occurredAt: true,
    },
    orderBy: (table, { asc }) => [asc(table.occurredAt)],
  });

  return NextResponse.json({ lots: summarizeMaterialLotOptions(movements) });
}
