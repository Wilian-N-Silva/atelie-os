import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, financeEntries, incidents, inventoryLocations, items, orders, stockMovements } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { INCIDENT_WRITE_ROLES } from "@/lib/permissions";

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
    const metadata = row.metadata as {
      orderTitle?: string;
      itemTitle?: string;
      resolutionType?: string;
      replacementOrderId?: string | null;
      replacementOrderNumber?: string | null;
    };
    return {
      ...row,
      orderNumber: row.orderNumber ?? metadata.orderTitle ?? null,
      itemName: row.itemName ?? metadata.itemTitle ?? null,
      quantity: row.quantity == null ? null : Number(row.quantity),
      resolutionType: metadata.resolutionType ?? null,
      replacementOrderId: metadata.replacementOrderId ?? null,
      replacementOrderNumber: metadata.replacementOrderNumber ?? null,
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
  const roleError = requireAppRole(context, INCIDENT_WRITE_ROLES);
  if (roleError) return roleError;
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

    // Stock is NOT moved on creation: a returned product only re-enters stock
    // after review, via the resolution decision (PRD 10.9).

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

async function blockedLocationId(companyId: string) {
  const blocked = await db.query.inventoryLocations.findFirst({
    where: and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.type, "blocked"), eq(inventoryLocations.isActive, true)),
    columns: { id: true },
  });
  return blocked?.id ?? null;
}

const STOCK_IMPACTS = ["available", "blocked", "loss", "none"] as const;
type StockImpact = (typeof STOCK_IMPACTS)[number];

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, INCIDENT_WRITE_ROLES);
  if (roleError) return roleError;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const incidentId = cleanString(body?.incidentId, 80);
  const stockImpact: StockImpact = STOCK_IMPACTS.includes(body?.stockImpact as StockImpact) ? (body!.stockImpact as StockImpact) : "none";
  const resolution = cleanString(body?.resolution, 500);
  const resolutionType = cleanString(body?.resolutionType, 40) || "resolved";
  const replacementOrderId = cleanString(body?.replacementOrderId, 80) || null;
  const refundRaw = Number(body?.refundAmount);
  const refundAmount = Number.isFinite(refundRaw) && refundRaw > 0 ? Math.round(refundRaw * 100) / 100 : 0;
  if (!incidentId) return NextResponse.json({ error: "invalid_incident" }, { status: 400 });

  const incident = await db.query.incidents.findFirst({
    where: and(eq(incidents.companyId, context.company.id), eq(incidents.id, incidentId)),
  });
  if (!incident) return NextResponse.json({ error: "incident_not_found" }, { status: 404 });
  if (incident.status !== "open") return NextResponse.json({ error: "incident_not_open" }, { status: 409 });
  let replacementOrder: { id: string; number: string } | null = null;
  if (replacementOrderId) {
    const found = await db.query.orders.findFirst({
      where: and(eq(orders.companyId, context.company.id), eq(orders.id, replacementOrderId)),
      columns: { id: true, number: true },
    });
    if (!found) return NextResponse.json({ error: "replacement_order_not_found" }, { status: 404 });
    replacementOrder = found;
  }

  const quantity = incident.quantity == null ? 0 : Number(incident.quantity);

  await db.transaction(async (tx) => {
    if (stockImpact !== "none" && incident.itemId && quantity > 0) {
      const defaultLoc = await defaultLocationId(context.company.id, incident.itemId);
      if (stockImpact === "loss") {
        await tx.insert(stockMovements).values({
          companyId: context.company.id,
          itemId: incident.itemId,
          movementType: "loss",
          quantity: quantity.toString(),
          fromLocationId: defaultLoc,
          reason: `Perda na devolucao do incidente: ${incident.reason}`,
          sourceType: "incident.loss",
          sourceId: `${incident.id}:loss`,
          createdByUserId: context.user.id,
          metadata: { incidentId: incident.id, type: incident.type },
        });
      } else {
        const toLocationId = stockImpact === "blocked" ? (await blockedLocationId(context.company.id)) ?? defaultLoc : defaultLoc;
        await tx.insert(stockMovements).values({
          companyId: context.company.id,
          itemId: incident.itemId,
          movementType: "return",
          quantity: quantity.toString(),
          toLocationId,
          reason: `Retorno (${stockImpact === "blocked" ? "bloqueado para revisao" : "disponivel"}): ${incident.reason}`,
          sourceType: "incident.return",
          sourceId: `${incident.id}:return`,
          createdByUserId: context.user.id,
          metadata: { incidentId: incident.id, type: incident.type, stockImpact },
        });
      }
    }

    if (refundAmount > 0) {
      await tx.insert(financeEntries).values({
        companyId: context.company.id,
        type: "despesa",
        status: "pending",
        description: `Reembolso incidente ${incident.id.slice(0, 8)}`,
        amount: refundAmount.toString(),
        sourceType: "incident.refund",
        sourceId: incident.id,
        createdByUserId: context.user.id,
        metadata: { incidentId: incident.id },
      });
    }

    const incidentMetadata = {
      ...(incident.metadata as Record<string, unknown>),
      stockImpact,
      refundAmount,
      resolutionType,
      replacementOrderId: replacementOrder?.id ?? null,
      replacementOrderNumber: replacementOrder?.number ?? null,
    };

    await tx.update(incidents).set({
      status: "resolved",
      resolution: resolution || incident.resolution,
      metadata: incidentMetadata,
      updatedAt: new Date(),
    }).where(eq(incidents.id, incident.id));

    if (incident.orderId) {
      const order = await tx.query.orders.findFirst({
        where: and(eq(orders.companyId, context.company.id), eq(orders.id, incident.orderId)),
        columns: { id: true, metadata: true },
      });
      if (order) {
        const metadata = order.metadata as Record<string, unknown>;
        const history = Array.isArray(metadata.incidentHistory) ? metadata.incidentHistory : [];
        await tx.update(orders).set({
          metadata: {
            ...metadata,
            incidentHistory: [
              ...history,
              {
                incidentId: incident.id,
                type: incident.type,
                resolutionType,
                stockImpact,
                refundAmount,
                replacementOrderId: replacementOrder?.id ?? null,
                replacementOrderNumber: replacementOrder?.number ?? null,
                resolvedAt: new Date().toISOString(),
              },
            ],
          },
          updatedAt: new Date(),
        }).where(eq(orders.id, order.id));
      }
    }

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "incident.update",
      entityType: "incident",
      entityId: incident.id,
      metadata: { operation: "resolve", stockImpact, refundAmount, resolutionType, replacementOrderId: replacementOrder?.id ?? null },
    });
  });

  return NextResponse.json({ incidents: await listIncidents(context.company.id) });
}
