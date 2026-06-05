import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, incidents, inventoryLocations, items, orders, stockMovements } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanQuantity(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 1000) / 1000 : null;
}

async function defaultLocationId(companyId: string, itemId: string) {
  const item = await db.query.items.findFirst({
    where: and(eq(items.companyId, companyId), eq(items.id, itemId)),
    columns: { defaultLocationId: true },
  });
  if (item?.defaultLocationId) return item.defaultLocationId;
  const location = await db.query.inventoryLocations.findFirst({
    where: and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.isActive, true)),
    columns: { id: true },
  });
  return location?.id ?? null;
}

async function listIncidents(companyId: string) {
  const rows = await db
    .select({
      id: incidents.id,
      type: incidents.type,
      status: incidents.status,
      quantity: incidents.quantity,
      reason: incidents.reason,
      resolution: incidents.resolution,
      metadata: incidents.metadata,
      createdAt: incidents.createdAt,
      orderNumber: orders.number,
      itemSku: items.sku,
      itemName: items.name,
    })
    .from(incidents)
    .leftJoin(orders, eq(incidents.orderId, orders.id))
    .leftJoin(items, eq(incidents.itemId, items.id))
    .where(eq(incidents.companyId, companyId))
    .orderBy(desc(incidents.createdAt))
    .limit(80);
  return rows.map((row) => {
    const metadata = row.metadata as { orderTitle?: string; itemTitle?: string };
    return {
      ...row,
      orderNumber: row.orderNumber ?? metadata.orderTitle ?? null,
      itemName: row.itemName ?? metadata.itemTitle ?? null,
      quantity: row.quantity == null ? null : Number(row.quantity),
      createdAt: row.createdAt.toISOString(),
    };
  });
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ incidents: await listIncidents(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const type = cleanString(body?.type, 40);
  const reason = cleanString(body?.reason, 500);
  const orderId = cleanString(body?.orderId, 80) || null;
  const itemId = cleanString(body?.itemId, 80) || null;
  const orderTitle = cleanString(body?.orderTitle, 120) || null;
  const itemTitle = cleanString(body?.itemTitle, 120) || null;
  const quantity = cleanQuantity(body?.quantity);
  if (!["return", "exchange", "loss", "complaint"].includes(type) || !reason) {
    return NextResponse.json({ error: "invalid_incident" }, { status: 400 });
  }

  if (orderId) {
    const order = await db.query.orders.findFirst({
      where: and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)),
      columns: { id: true },
    });
    if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  }
  if (itemId) {
    const item = await db.query.items.findFirst({
      where: and(eq(items.companyId, context.company.id), eq(items.id, itemId)),
      columns: { id: true },
    });
    if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });
  }

  await db.transaction(async (tx) => {
    const [incident] = await tx.insert(incidents).values({
      companyId: context.company.id,
      orderId,
      itemId,
      type,
      status: "open",
      quantity: quantity == null ? null : quantity.toString(),
      reason,
      resolution: cleanString(body?.resolution, 500) || null,
      createdByUserId: context.user.id,
      metadata: { orderTitle, itemTitle },
    }).returning({ id: incidents.id });

    if ((type === "return" || type === "exchange") && itemId && quantity) {
      await tx.insert(stockMovements).values({
        companyId: context.company.id,
        itemId,
        movementType: "return",
        quantity: quantity.toString(),
        toLocationId: await defaultLocationId(context.company.id, itemId),
        reason: `Retorno por incidente: ${reason}`,
        sourceType: "incident.return",
        sourceId: incident.id,
        createdByUserId: context.user.id,
        metadata: { incidentId: incident.id, orderId, type },
      });
    }

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "incident.create",
      entityType: "incident",
      entityId: incident.id,
      metadata: { type, orderId, itemId, quantity },
    });
  });

  return NextResponse.json({ incidents: await listIncidents(context.company.id) }, { status: 201 });
}
