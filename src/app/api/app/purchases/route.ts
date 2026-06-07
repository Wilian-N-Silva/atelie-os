import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, financeEntries, inventoryLocations, items, purchaseItems, purchases, stockMovements, suppliers } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { INVENTORY_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type PurchaseLineInput = {
  itemId?: unknown;
  quantity?: unknown;
  unitCost?: unknown;
  lot?: unknown;
  expiresAt?: unknown;
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanMoney(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

function cleanQuantity(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? Math.round(number * 1000) / 1000 : 0;
}

async function fallbackLocationId(companyId: string, itemId: string) {
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

async function nextPurchaseNumber(companyId: string) {
  const rows = await db.query.purchases.findMany({
    where: eq(purchases.companyId, companyId),
    columns: { number: true },
  });
  const max = rows.reduce((acc, row) => Math.max(acc, Number(row.number.replace(/\D/g, "")) || 0), 1000);
  return `COMP-${max + 1}`;
}

async function listPurchases(companyId: string) {
  const rows = await db
    .select({
      id: purchases.id,
      number: purchases.number,
      status: purchases.status,
      reference: purchases.reference,
      total: purchases.total,
      receivedAt: purchases.receivedAt,
      supplierId: purchases.supplierId,
      supplierName: suppliers.name,
    })
    .from(purchases)
    .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
    .where(eq(purchases.companyId, companyId))
    .orderBy(desc(purchases.receivedAt))
    .limit(80);

  return Promise.all(rows.map(async (row) => {
    const lines = await db
      .select({
        id: purchaseItems.id,
        itemId: purchaseItems.itemId,
        sku: items.sku,
        name: items.name,
        quantity: purchaseItems.quantity,
        unitCost: purchaseItems.unitCost,
        lot: purchaseItems.lot,
        expiresAt: purchaseItems.expiresAt,
      })
      .from(purchaseItems)
      .innerJoin(items, eq(purchaseItems.itemId, items.id))
      .where(eq(purchaseItems.purchaseId, row.id));
    return {
      ...row,
      total: Number(row.total),
      receivedAt: row.receivedAt.toISOString(),
      lines: lines.map((line) => ({ ...line, quantity: Number(line.quantity), unitCost: Number(line.unitCost) })),
    };
  }));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ purchases: await listPurchases(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, INVENTORY_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as {
    supplierId?: unknown;
    reference?: unknown;
    status?: unknown;
    lines?: PurchaseLineInput[];
  } | null;
  const lines = Array.isArray(body?.lines) ? body.lines.map((line) => ({
    itemId: cleanString(line.itemId, 80),
    quantity: cleanQuantity(line.quantity),
    unitCost: cleanMoney(line.unitCost),
    lot: cleanString(line.lot, 80) || null,
    expiresAt: cleanString(line.expiresAt, 40) || null,
  })).filter((line) => line.itemId && line.quantity > 0) : [];
  if (!lines.length) return NextResponse.json({ error: "invalid_purchase_lines" }, { status: 400 });

  const supplierId = cleanString(body?.supplierId, 80) || null;
  if (supplierId) {
    const supplier = await db.query.suppliers.findFirst({
      where: and(eq(suppliers.companyId, context.company.id), eq(suppliers.id, supplierId)),
      columns: { id: true },
    });
    if (!supplier) return NextResponse.json({ error: "supplier_not_found" }, { status: 404 });
  }

  for (const line of lines) {
    const item = await db.query.items.findFirst({
      where: and(eq(items.companyId, context.company.id), eq(items.id, line.itemId)),
      columns: { id: true },
    });
    if (!item) return NextResponse.json({ error: "item_not_found" }, { status: 404 });
  }

  const number = await nextPurchaseNumber(context.company.id);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitCost, 0);
  const locationByItemId = new Map<string, string | null>();
  for (const line of lines) {
    locationByItemId.set(line.itemId, await fallbackLocationId(context.company.id, line.itemId));
  }

  await db.transaction(async (tx) => {
    const [purchase] = await tx.insert(purchases).values({
      companyId: context.company.id,
      supplierId,
      number,
      status: cleanString(body?.status, 40) || "received",
      reference: cleanString(body?.reference, 120) || null,
      total: total.toString(),
      createdByUserId: context.user.id,
    }).returning({ id: purchases.id });

    for (const line of lines) {
      await tx.insert(purchaseItems).values({
        purchaseId: purchase.id,
        itemId: line.itemId,
        quantity: line.quantity.toString(),
        unitCost: line.unitCost.toString(),
        lot: line.lot,
        expiresAt: line.expiresAt,
      });

      await tx.insert(stockMovements).values({
        companyId: context.company.id,
        itemId: line.itemId,
        movementType: "purchase_entry",
        quantity: line.quantity.toString(),
        toLocationId: locationByItemId.get(line.itemId) ?? null,
        reason: `Entrada por compra ${number}`,
        sourceType: "purchase.receipt",
        sourceId: `${purchase.id}:${line.itemId}`,
        createdByUserId: context.user.id,
        metadata: { purchaseId: purchase.id, number, unitCost: line.unitCost, lot: line.lot },
      });
    }

    await tx.insert(financeEntries).values({
      companyId: context.company.id,
      type: "expense",
      status: cleanString(body?.status, 40) === "paid" ? "paid" : "pending",
      description: `Compra ${number}`,
      amount: total.toString(),
      sourceType: "purchase",
      sourceId: purchase.id,
      createdByUserId: context.user.id,
      metadata: { number, reference: cleanString(body?.reference, 120) || null },
    });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "purchase.create",
      entityType: "purchase",
      entityId: purchase.id,
      metadata: { number, supplierId, total, lines: lines.length },
    });
  });

  return NextResponse.json({ purchases: await listPurchases(context.company.id) }, { status: 201 });
}
