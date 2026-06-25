import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, customers, items, orderItems, orders } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { type CustomerAddress, type Order } from "@/lib/domain";
import { generateOrderTrackToken } from "@/lib/order-track-token";
import { applyOrderWorkflowAutomations } from "@/lib/workflow-automations-server";

export const runtime = "nodejs";

type OrderPatch = Partial<Pick<Order, "payment" | "status" | "freight" | "total" | "shippingQuote">>;

const CHANNELS = ["instagram", "whatsapp", "mercadolivre", "shopee", "feira", "direta"] as const;
const PAYMENTS = ["pago", "aguardando"] as const;
const LABEL_KINDS = ["internal", "pdf_attached"] as const;
const SHIPPED_STATUSES = new Set(["enviado", "entregue", "em_transito"]);
const CANCELLED_STATUSES = new Set(["cancelado", "cancelada", "canceled", "cancelled"]);

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

function isShippedStatus(status: string) {
  return SHIPPED_STATUSES.has(status);
}

function isCancelStatus(status: string) {
  return CANCELLED_STATUSES.has(status);
}

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNullableString(value: unknown, max: number) {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function cleanPostalCode(value: unknown) {
  return cleanString(value, 16).replace(/\D/g, "").slice(0, 8);
}

function cleanMoney(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
}

function cleanShippingQuote(value: unknown): Order["shippingQuote"] | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (!value || typeof value !== "object") return undefined;
  const input = value as NonNullable<Order["shippingQuote"]>;
  const serviceId = cleanString(input.serviceId, 40);
  const serviceName = cleanString(input.serviceName, 120);
  const provider = cleanString(input.provider, 40) || "melhor_envio";
  const price = cleanMoney(input.price);
  if (!serviceId || !serviceName || price <= 0) return undefined;
  return {
    provider,
    serviceId,
    serviceName,
    company: cleanNullableString(input.company, 80),
    price,
    deliveryTime: input.deliveryTime == null ? null : Math.max(0, Math.round(Number(input.deliveryTime) || 0)),
    selectedAt: cleanString(input.selectedAt, 40) || new Date().toISOString(),
  };
}

function cleanCustomerAddress(value: unknown): CustomerAddress | null {
  if (!value || typeof value !== "object") return null;
  const input = value as CustomerAddress;
  const address = cleanString(input.address, 160);
  const number = cleanString(input.number, 20);
  const district = cleanString(input.district, 80);
  const city = cleanString(input.city, 80);
  const stateAbbr = cleanString(input.stateAbbr, 2).toUpperCase();
  const postalCode = cleanPostalCode(input.postalCode);
  if (!address && !number && !district && !city && !stateAbbr && !postalCode) return null;
  return {
    address,
    number,
    complement: cleanNullableString(input.complement, 80),
    district,
    city,
    stateAbbr,
    postalCode,
  };
}

function customerIncomplete(input: {
  channel: Order["channel"];
  customerAddress?: CustomerAddress | null;
  customerDocument?: string | null;
}) {
  const external = input.channel === "mercadolivre" || input.channel === "shopee";
  if (external) return false;
  const address = input.customerAddress;
  return !(
    address?.address
      && address.number
      && address.district
      && address.city
      && /^[A-Z]{2}$/.test(address.stateAbbr)
      && address.postalCode.length === 8
      && input.customerDocument
  );
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
    customerId: cleanNullableString(input.customerId, 80),
    channel: input.channel,
    labelKind: input.labelKind,
    customerName,
    city,
    customerEmail: cleanNullableString(input.customerEmail, 120),
    customerPhone: cleanNullableString(input.customerPhone, 30),
    customerDocument: cleanNullableString(input.customerDocument, 24),
    customerAddress: cleanCustomerAddress(input.customerAddress),
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
  if (input.freight !== undefined) patch.freight = cleanMoney(input.freight);
  if (input.total !== undefined) patch.total = cleanMoney(input.total);
  if (input.shippingQuote !== undefined) {
    const quote = cleanShippingQuote(input.shippingQuote);
    if (quote === undefined) return null;
    patch.shippingQuote = quote;
  }
  return patch;
}

function metadataString(metadata: Record<string, unknown>, key: string) {
  const value = metadata[key];
  return typeof value === "string" && value.trim() ? value : null;
}

function metadataShippingQuote(metadata: Record<string, unknown>): Order["shippingQuote"] {
  const quote = metadata.shippingQuote;
  if (!quote || typeof quote !== "object") return null;
  return cleanShippingQuote(quote) ?? null;
}

function metadataCustomerAddress(metadata: Record<string, unknown>): CustomerAddress | null {
  return cleanCustomerAddress(metadata.customerAddress);
}

function metadataShippingLabel(metadata: Record<string, unknown>): Order["shippingLabel"] {
  const label = metadata.shippingLabel;
  if (!label || typeof label !== "object") return null;
  const input = label as NonNullable<Order["shippingLabel"]>;
  const externalId = cleanString(input.externalId, 120);
  const serviceId = cleanString(input.serviceId, 40);
  const serviceName = cleanString(input.serviceName, 120);
  if (!externalId || !serviceId || !serviceName) return null;
  const price = input.price == null ? null : cleanMoney(input.price);
  return {
    provider: cleanString(input.provider, 40) || "melhor_envio",
    externalId,
    protocol: cleanNullableString(input.protocol, 120),
    status: cleanNullableString(input.status, 80),
    serviceId,
    serviceName,
    company: cleanNullableString(input.company, 80),
    price,
    tracking: cleanNullableString(input.tracking, 120),
    trackingUrl: cleanNullableString(input.trackingUrl, 500),
    cartInsertedAt: cleanString(input.cartInsertedAt, 40) || new Date().toISOString(),
    checkoutAt: cleanNullableString(input.checkoutAt, 40),
    generatedAt: cleanNullableString(input.generatedAt, 40),
    previewUrl: cleanNullableString(input.previewUrl, 500),
    printUrl: cleanNullableString(input.printUrl, 500),
  };
}

async function itemIdsBySku(companyId: string, skus: string[]) {
  if (!skus.length) return new Map<string, string>();
  const rows = await db.query.items.findMany({
    where: and(eq(items.companyId, companyId), inArray(items.sku, skus)),
    columns: { id: true, sku: true },
  });
  return new Map(rows.map((item) => [item.sku, item.id]));
}

async function orderSubtotal(companyId: string, orderId: string, fallback: number) {
  const lines = await db
    .select({
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      currentPrice: items.currentPrice,
      suggestedPrice: items.suggestedPrice,
    })
    .from(orderItems)
    .leftJoin(items, and(eq(orderItems.itemId, items.id), eq(items.companyId, companyId)))
    .where(eq(orderItems.orderId, orderId));

  const subtotal = lines.reduce((sum, line) => {
    const quantity = Number(line.quantity);
    const unitPrice = Number(line.unitPrice ?? line.currentPrice ?? line.suggestedPrice);
    if (!Number.isFinite(quantity) || !Number.isFinite(unitPrice)) return sum;
    return sum + quantity * unitPrice;
  }, 0);

  return subtotal > 0 ? Math.round(subtotal * 100) / 100 : fallback;
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
      customerId: row.customerId,
      channel: isChannel(row.channelKey) ? row.channelKey : "direta",
      labelKind: isLabelKind(row.labelKind) ? row.labelKind : "internal",
      customerName: row.customerName,
      city: row.city,
      customerEmail: metadataString(row.metadata, "customerEmail"),
      customerPhone: metadataString(row.metadata, "customerPhone"),
      customerDocument: metadataString(row.metadata, "customerDocument"),
      customerAddress: metadataCustomerAddress(row.metadata),
      customerIncomplete: row.metadata.customerIncomplete === true,
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
      trackToken: row.trackToken,
      note: row.note,
      shippingQuote: metadataShippingQuote(row.metadata),
      shippingLabel: metadataShippingLabel(row.metadata),
    });
  }

  return result;
}

async function createOrder(companyId: string, actorUserId: string, input: Order) {
  const skuToItemId = await itemIdsBySku(companyId, input.items.map((line) => line.sku));

  return db.transaction(async (tx) => {
    let customerId = input.customerId ?? null;
    if (customerId) {
      const existingCustomer = await tx.query.customers.findFirst({
        where: and(eq(customers.companyId, companyId), eq(customers.id, customerId)),
        columns: { id: true },
      });
      if (!existingCustomer) customerId = null;
      if (existingCustomer) {
        const existingCustomerId = existingCustomer.id;
        await tx.update(customers).set({
          name: input.customerName,
          email: input.customerEmail ?? null,
          phone: input.customerPhone ?? null,
          document: input.customerDocument ?? null,
          address: input.customerAddress?.address ?? null,
          number: input.customerAddress?.number ?? null,
          complement: input.customerAddress?.complement ?? null,
          district: input.customerAddress?.district ?? null,
          city: input.customerAddress?.city ?? input.city,
          stateAbbr: input.customerAddress?.stateAbbr ?? null,
          postalCode: input.customerAddress?.postalCode ?? null,
          updatedAt: new Date(),
        }).where(and(eq(customers.companyId, companyId), eq(customers.id, existingCustomerId)));

        await tx.insert(auditLogs).values({
          companyId,
          actorUserId,
          action: "customer.upsert",
          entityType: "customer",
          entityId: existingCustomerId,
          metadata: { source: "order.create", name: input.customerName, channel: input.channel },
        });
      }
    }
    if (!customerId && input.customerName) {
      const [customer] = await tx.insert(customers).values({
        companyId,
        name: input.customerName,
        email: input.customerEmail ?? null,
        phone: input.customerPhone ?? null,
        document: input.customerDocument ?? null,
        address: input.customerAddress?.address ?? null,
        number: input.customerAddress?.number ?? null,
        complement: input.customerAddress?.complement ?? null,
        district: input.customerAddress?.district ?? null,
        city: input.customerAddress?.city ?? input.city,
        stateAbbr: input.customerAddress?.stateAbbr ?? null,
        postalCode: input.customerAddress?.postalCode ?? null,
        source: `order_${input.channel}`,
        metadata: { firstOrderChannel: input.channel },
      }).returning({ id: customers.id });
      customerId = customer.id;

      await tx.insert(auditLogs).values({
        companyId,
        actorUserId,
        action: "customer.upsert",
        entityType: "customer",
        entityId: customer.id,
        metadata: { source: "order.create", name: input.customerName, channel: input.channel },
      });
    }

    const [order] = await tx
      .insert(orders)
      .values({
        companyId,
        customerId,
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
        trackToken: generateOrderTrackToken(),
        note: input.note,
        source: "manual",
        createdByUserId: actorUserId,
        metadata: {
          createdAtLabel: input.createdAt,
          customerEmail: input.customerEmail ?? null,
          customerPhone: input.customerPhone ?? null,
          customerDocument: input.customerDocument ?? null,
          customerAddress: input.customerAddress ?? null,
          customerIncomplete: customerIncomplete(input),
        },
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
    columns: { id: true, status: true, paymentStatus: true, freight: true, discount: true, total: true, tracking: true, metadata: true },
  });
  if (!existing) return NextResponse.json({ error: "order_not_found" }, { status: 404 });
  const nextStatus = patch.status ?? existing.status;
  const shippingLabel = metadataShippingLabel(existing.metadata);
  const hasShipment = Boolean(existing.tracking || shippingLabel?.tracking || shippingLabel?.generatedAt || shippingLabel?.printUrl);
  if ((isShippedStatus(existing.status) || hasShipment) && isCancelStatus(nextStatus)) {
    return NextResponse.json({ error: "shipped_order_cannot_cancel_directly" }, { status: 409 });
  }
  const previousFreight = Number(existing.freight);
  const previousTotal = Number(existing.total);
  const discount = Number(existing.discount);
  const fallbackSubtotal = Math.max(0, previousTotal - previousFreight + discount);
  const subtotal = patch.freight !== undefined
    ? await orderSubtotal(context.company.id, orderId, fallbackSubtotal)
    : fallbackSubtotal;

  await db.transaction(async (tx) => {
    const next = {
      status: nextStatus,
      paymentStatus: patch.payment ?? existing.paymentStatus,
    };
    const updates: Partial<typeof orders.$inferInsert> = {
      status: next.status,
      paymentStatus: next.paymentStatus,
      updatedAt: new Date(),
    };
    if (patch.freight !== undefined) {
      updates.freight = patch.freight.toString();
      updates.total = Math.max(0, subtotal + patch.freight - discount).toFixed(2);
    } else if (patch.total !== undefined) {
      updates.total = patch.total.toString();
    }

    if (patch.shippingQuote !== undefined) {
      updates.metadata = {
        ...existing.metadata,
        shippingQuote: patch.shippingQuote,
      };
    }

    await tx
      .update(orders)
      .set(updates)
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
