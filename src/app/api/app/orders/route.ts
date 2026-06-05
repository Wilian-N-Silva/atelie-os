import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, items, orderItems, orders } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { type Order } from "@/lib/domain";
import { applyOrderWorkflowAutomations } from "@/lib/workflow-automations-server";

export const runtime = "nodejs";

type OrderPatch = Partial<Pick<Order, "payment" | "status">>;

const CHANNELS = ["instagram", "whatsapp", "mercadolivre", "shopee", "feira", "direta"] as const;
const PAYMENTS = ["pago", "aguardando"] as const;
const LABEL_KINDS = ["internal", "pdf_attached"] as const;

// Status keys are company-configurable workflow step keys; accept any non-empty
// technical key rather than validating against a hardcoded set.
function isOrderStatus(value: unknown): value is Order["status"] {
  return typeof value === "string" && /^[a-z0-9_]{1,64}$/.test(value);
}

function isPayment(value: unknown): value is Order["payment"] {
  return PAYMENTS.includes(value as Order["payment"]);
}

function isChannel(value: unknown): value is Order["channel"] {
  return CHANNELS.includes(value as Order["channel"]);
}

function isLabelKind(value: unknown): value is NonNullable<Order["labelKind"]> {
  return LABEL_KINDS.includes(value as NonNullable<Order["labelKind"]>);
}

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNullableString(value: unknown, max: number) {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function cleanMoney(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function cleanOrder(value: unknown): Order | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Order;
  const code = cleanString(input.code, 12);
  const num = cleanString(input.num, 32);
  const customerName = cleanString(input.customerName, 120);
  const city = cleanString(input.city, 120);
  const createdAt = cleanString(input.createdAt, 40) || "agora";

  if (!/^\d{12}$/.test(code) || !num || !customerName || !city) return null;
  if (!isChannel(input.channel) || !isOrderStatus(input.status) || !isPayment(input.payment)) return null;
  if (input.labelKind != null && !isLabelKind(input.labelKind)) return null;
  if (!Array.isArray(input.items) || !input.items.length) return null;

  const orderLines = input.items
    .map((line) => ({
      sku: cleanString(line.sku, 64).toUpperCase(),
      qty: Math.max(1, Math.round(Number(line.qty) || 1)),
      unitPrice: line.unitPrice == null ? undefined : cleanMoney(line.unitPrice),
    }))
    .filter((line) => line.sku);

  if (!orderLines.length) return null;

  return {
    id: cleanString(input.id, 80) || code,
    code,
    num,
    channel: input.channel,
    labelKind: input.labelKind,
    customerName,
    city,
    status: input.status,
    payment: input.payment,
    createdAt,
    freight: cleanMoney(input.freight),
    discount: cleanMoney(input.discount),
    total: cleanMoney(input.total),
    items: orderLines,
    tracking: cleanNullableString(input.tracking, 80),
    note: cleanNullableString(input.note, 500),
  };
}

function cleanPatch(value: unknown): OrderPatch | null {
  if (!value || typeof value !== "object") return null;
  const input = value as OrderPatch;
  const patch: OrderPatch = {};
  if (input.payment !== undefined) {
    if (!isPayment(input.payment)) return null;
    patch.payment = input.payment;
  }
  if (input.status !== undefined) {
    if (!isOrderStatus(input.status)) return null;
    patch.status = input.status;
  }
  return patch;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

async function itemIdsBySku(companyId: string, skus: string[]) {
  if (!skus.length) return new Map<string, string>();
  const rows = await db.query.items.findMany({
    where: and(eq(items.companyId, companyId), inArray(items.sku, skus)),
    columns: { id: true, sku: true },
  });
  return new Map(rows.map((item) => [item.sku, item.id]));
}

async function listOrders(companyId: string): Promise<Order[]> {
  const rows = await db.query.orders.findMany({
    where: eq(orders.companyId, companyId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });

  const result: Order[] = [];
  for (const row of rows) {
    const lines = await db.query.orderItems.findMany({
      where: eq(orderItems.orderId, row.id),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    result.push({
      id: row.id,
      code: row.code,
      num: row.number,
      channel: isChannel(row.channelKey) ? row.channelKey : "direta",
      labelKind: isLabelKind(row.labelKind) ? row.labelKind : "internal",
      customerName: row.customerName,
      city: row.city,
      status: isOrderStatus(row.status) ? row.status : "aguardando_pagamento",
      payment: isPayment(row.paymentStatus) ? row.paymentStatus : "aguardando",
      createdAt: metadataString(row.metadata, "createdAtLabel") ?? "agora",
      freight: Number(row.freight),
      discount: Number(row.discount),
      total: Number(row.total),
      items: lines.map((line) => ({
        sku: line.sku,
        qty: Number(line.quantity),
        unitPrice: line.unitPrice == null ? undefined : Number(line.unitPrice),
      })),
      tracking: row.tracking,
      note: row.note,
    });
  }

  return result;
}

async function createOrder(companyId: string, actorUserId: string, input: Order) {
  const skuToItemId = await itemIdsBySku(companyId, input.items.map((line) => line.sku));

  return db.transaction(async (tx) => {
    const [order] = await tx
      .insert(orders)
      .values({
        companyId,
        code: input.code,
        number: input.num,
        channelKey: input.channel,
        customerName: input.customerName,
        city: input.city,
        status: input.status,
        paymentStatus: input.payment,
        labelKind: input.labelKind ?? "internal",
        freight: input.freight.toString(),
        discount: input.discount.toString(),
        total: input.total.toString(),
        tracking: input.tracking,
        note: input.note,
        source: "manual",
        createdByUserId: actorUserId,
        metadata: { createdAtLabel: input.createdAt },
      })
      .returning({ id: orders.id });

    await tx.insert(orderItems).values(input.items.map((line) => ({
      orderId: order.id,
      itemId: skuToItemId.get(line.sku) ?? null,
      sku: line.sku,
      quantity: line.qty.toString(),
      unitPrice: line.unitPrice == null ? null : line.unitPrice.toString(),
    })));

    await applyOrderWorkflowAutomations({
      tx,
      companyId,
      actorUserId,
      orderId: order.id,
      previous: { status: "aguardando_pagamento", paymentStatus: "aguardando" },
      next: { status: input.status, paymentStatus: input.payment },
    });

    await tx.insert(auditLogs).values({
      companyId,
      actorUserId,
      action: "order.create",
      entityType: "order",
      entityId: order.id,
      metadata: {
        code: input.code,
        number: input.num,
        source: "manual",
      },
    });

    return order;
  });
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  return NextResponse.json({ orders: await listOrders(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { order?: unknown } | null;
  const order = cleanOrder(body?.order);
  if (!order) return NextResponse.json({ error: "invalid_order" }, { status: 400 });

  await createOrder(context.company.id, context.user.id, order);
  return NextResponse.json({ orders: await listOrders(context.company.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as {
    orderId?: unknown;
    patch?: unknown;
  } | null;
  const orderId = cleanString(body?.orderId, 80);
  const patch = cleanPatch(body?.patch);
  if (!orderId || !patch) return NextResponse.json({ error: "invalid_patch" }, { status: 400 });

  const existing = await db.query.orders.findFirst({
    where: and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)),
    columns: { id: true, status: true, paymentStatus: true },
  });
  if (!existing) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  await db.transaction(async (tx) => {
    const next = {
      status: patch.status ?? existing.status,
      paymentStatus: patch.payment ?? existing.paymentStatus,
    };

    await tx
      .update(orders)
      .set({
        status: next.status,
        paymentStatus: next.paymentStatus,
        updatedAt: new Date(),
      })
      .where(and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)));

    await applyOrderWorkflowAutomations({
      tx,
      companyId: context.company.id,
      actorUserId: context.user.id,
      orderId,
      previous: existing,
      next,
    });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "order.update",
      entityType: "order",
      entityId: orderId,
      metadata: {
        previous: {
          status: existing.status,
          payment: existing.paymentStatus,
        },
        next: patch,
      },
    });
  });

  return NextResponse.json({ orders: await listOrders(context.company.id) });
}
