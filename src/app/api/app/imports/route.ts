import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, channelSkuMappings, customers, importOrders, items, orderItems, orders } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { parseOrdersCsv, type ImportLine } from "@/lib/import-orders";
import { generateOrderTrackToken } from "@/lib/order-track-token";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

type MappingInfo = { itemId: string; sku: string };

async function channelMappings(companyId: string, channelKey: string): Promise<Map<string, MappingInfo>> {
  const rows = await db
    .select({ externalSku: channelSkuMappings.externalSku, itemId: channelSkuMappings.itemId, sku: items.sku })
    .from(channelSkuMappings)
    .leftJoin(items, eq(channelSkuMappings.itemId, items.id))
    .where(and(eq(channelSkuMappings.companyId, companyId), eq(channelSkuMappings.channelKey, channelKey)));
  const map = new Map<string, MappingInfo>();
  for (const row of rows) {
    if (row.itemId && row.sku) map.set(row.externalSku, { itemId: row.itemId, sku: row.sku });
  }
  return map;
}

function importLines(payload: Record<string, unknown>): ImportLine[] {
  const lines = Array.isArray(payload.lines) ? payload.lines : [];
  return lines.flatMap((line) => {
    if (!line || typeof line !== "object") return [];
    const row = line as Record<string, unknown>;
    const sku = cleanString(row.sku, 64);
    const qty = Number(row.qty);
    if (!sku || !Number.isFinite(qty) || qty <= 0) return [];
    return [{ sku, qty, price: Number(row.price) || 0 }];
  });
}

function payloadString(payload: Record<string, unknown>, key: string, max: number) {
  return cleanString(payload[key], max);
}

function unmappedSkus(lines: ImportLine[], mappings: Map<string, MappingInfo>) {
  return [...new Set(lines.map((line) => line.sku))].filter((sku) => !mappings.has(sku));
}

async function listImports(companyId: string) {
  const [rows, mappingRows] = await Promise.all([
    db.select().from(importOrders).where(eq(importOrders.companyId, companyId)).orderBy(desc(importOrders.createdAt)).limit(200),
    db
      .select({ id: channelSkuMappings.id, channelKey: channelSkuMappings.channelKey, externalSku: channelSkuMappings.externalSku, itemId: channelSkuMappings.itemId, sku: items.sku, name: items.name })
      .from(channelSkuMappings)
      .leftJoin(items, eq(channelSkuMappings.itemId, items.id))
      .where(eq(channelSkuMappings.companyId, companyId))
      .orderBy(channelSkuMappings.channelKey),
  ]);

  const imports = rows.map((row) => {
    const payload = row.rawPayload as Record<string, unknown>;
    return {
      id: row.id,
      channelKey: row.channelKey,
      externalOrderId: row.externalOrderId,
      buyerName: row.buyerName,
      buyerEmail: row.buyerEmail,
      status: row.status,
      errorReason: row.errorReason,
      total: Number(row.total),
      lines: importLines(payload),
      tracking: payloadString(payload, "tracking", 120),
      labelPdfUrl: payloadString(payload, "labelPdfUrl", 500),
      createdOrderId: row.createdOrderId,
    };
  });

  return {
    imports,
    mappings: mappingRows.map((m) => ({ id: m.id, channelKey: m.channelKey, externalSku: m.externalSku, itemId: m.itemId, itemSku: m.sku, itemName: m.name })),
    summary: {
      pending: imports.filter((i) => i.status === "pending").length,
      ready: imports.filter((i) => i.status === "ready").length,
      imported: imports.filter((i) => i.status === "imported").length,
    },
  };
}

async function generateOrderCode(companyId: string) {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    const code = "0403" + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join("");
    const [clash] = await db.select({ id: orders.id }).from(orders).where(and(eq(orders.companyId, companyId), eq(orders.code, code))).limit(1);
    if (!clash) return code;
  }
  throw new Error("could_not_allocate_order_code");
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json(await listImports(contextResult.context.company.id));
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { channelKey?: unknown; csv?: unknown } | null;
  const channelKey = cleanString(body?.channelKey, 40) || "marketplace";
  const csv = typeof body?.csv === "string" ? body.csv : "";
  const parsed = parseOrdersCsv(csv);
  if (!parsed.length) return NextResponse.json({ error: "no_orders_parsed" }, { status: 400 });

  const mappings = await channelMappings(context.company.id, channelKey);

  const existing = await db
    .select({ externalOrderId: importOrders.externalOrderId })
    .from(importOrders)
    .where(and(eq(importOrders.companyId, context.company.id), eq(importOrders.channelKey, channelKey)));
  const seen = new Set(existing.map((row) => row.externalOrderId));

  let created = 0;
  for (const order of parsed) {
    if (seen.has(order.externalOrderId)) continue;
    const unmapped = unmappedSkus(order.lines, mappings);
    await db.insert(importOrders).values({
      companyId: context.company.id,
      channelKey,
      externalOrderId: order.externalOrderId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail || null,
      status: unmapped.length ? "pending" : "ready",
      errorReason: unmapped.length ? `SKU nao mapeado: ${unmapped.join(", ")}` : null,
      total: order.total.toString(),
      rawPayload: {
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        tracking: order.tracking,
        labelPdfUrl: order.labelPdfUrl,
        lines: order.lines,
      },
      createdByUserId: context.user.id,
    });
    created += 1;
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "import.run",
    entityType: "import",
    entityId: channelKey,
    metadata: { channelKey, parsed: parsed.length, created },
  });

  return NextResponse.json({ ...(await listImports(context.company.id)), created }, { status: 201 });
}

async function reevaluatePending(companyId: string, channelKey: string) {
  const mappings = await channelMappings(companyId, channelKey);
  const pending = await db
    .select()
    .from(importOrders)
    .where(and(eq(importOrders.companyId, companyId), eq(importOrders.channelKey, channelKey), inArray(importOrders.status, ["pending", "ready"])));
  for (const row of pending) {
    const unmapped = unmappedSkus(importLines(row.rawPayload as Record<string, unknown>), mappings);
    const status = unmapped.length ? "pending" : "ready";
    await db.update(importOrders).set({
      status,
      errorReason: unmapped.length ? `SKU nao mapeado: ${unmapped.join(", ")}` : null,
      updatedAt: new Date(),
    }).where(eq(importOrders.id, row.id));
  }
}

async function importOne(companyId: string, actorUserId: string, importId: string) {
  const [row] = await db.select().from(importOrders).where(and(eq(importOrders.companyId, companyId), eq(importOrders.id, importId))).limit(1);
  if (!row || row.status === "imported") return { ok: false as const };
  const mappings = await channelMappings(companyId, row.channelKey);
  const lines = importLines(row.rawPayload as Record<string, unknown>);
  const unmapped = unmappedSkus(lines, mappings);
  if (unmapped.length) return { ok: false as const };

  const code = await generateOrderCode(companyId);
  await db.transaction(async (tx) => {
    const payload = row.rawPayload as Record<string, unknown>;
    const buyerEmail = cleanString(row.buyerEmail, 120);
    const tracking = payloadString(payload, "tracking", 120) || null;
    const labelPdfUrl = payloadString(payload, "labelPdfUrl", 500) || null;
    let customerId: string | null = null;
    if (buyerEmail) {
      const existingCustomer = await tx.query.customers.findFirst({
        where: and(eq(customers.companyId, companyId), eq(customers.email, buyerEmail)),
        columns: { id: true },
      });
      if (existingCustomer) {
        customerId = existingCustomer.id;
        await tx.update(customers).set({
          name: row.buyerName || "Cliente marketplace",
          source: `import_${row.channelKey}`,
          updatedAt: new Date(),
        }).where(eq(customers.id, customerId));
      }
    }
    if (!customerId) {
      const [customer] = await tx.insert(customers).values({
        companyId,
        name: row.buyerName || "Cliente marketplace",
        email: buyerEmail || null,
        city: "-",
        source: `import_${row.channelKey}`,
        metadata: { externalOrderId: row.externalOrderId, channel: row.channelKey },
      }).returning({ id: customers.id });
      customerId = customer.id;
    }

    const [order] = await tx.insert(orders).values({
      companyId,
      customerId,
      code,
      number: `EXT-${row.externalOrderId}`.slice(0, 40),
      channelKey: row.channelKey,
      customerName: row.buyerName || "Cliente marketplace",
      city: "-",
      status: "a_separar",
      paymentStatus: "pago",
      labelKind: labelPdfUrl ? "pdf_attached" : "internal",
      total: row.total,
      tracking,
      trackToken: generateOrderTrackToken(),
      source: `import_${row.channelKey}`,
      createdByUserId: actorUserId,
      metadata: {
        createdAtLabel: "importado",
        customerEmail: row.buyerEmail ?? null,
        externalOrderId: row.externalOrderId,
        channel: row.channelKey,
        marketplaceLabelPdf: labelPdfUrl,
        shippingLabel: labelPdfUrl ? {
          provider: "marketplace_pdf",
          externalId: row.externalOrderId,
          protocol: null,
          status: "attached",
          serviceId: "external",
          serviceName: "Etiqueta marketplace",
          company: row.channelKey,
          price: null,
          tracking,
          trackingUrl: null,
          cartInsertedAt: new Date().toISOString(),
          generatedAt: new Date().toISOString(),
          printUrl: labelPdfUrl,
        } : null,
      },
    }).returning({ id: orders.id });

    await tx.insert(orderItems).values(lines.map((line) => {
      const mapping = mappings.get(line.sku)!;
      return {
        orderId: order.id,
        itemId: mapping.itemId,
        sku: mapping.sku,
        quantity: line.qty.toString(),
        unitPrice: line.price ? line.price.toString() : null,
      };
    }));

    await tx.update(importOrders).set({ status: "imported", createdOrderId: order.id, errorReason: null, updatedAt: new Date() }).where(eq(importOrders.id, importId));

    await tx.insert(auditLogs).values({
      companyId,
      actorUserId,
      action: "order.create",
      entityType: "order",
      entityId: order.id,
      metadata: { source: "import", channel: row.channelKey, externalOrderId: row.externalOrderId },
    });
  });
  return { ok: true as const };
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const action = cleanString(body?.action, 20);

  if (action === "map") {
    const channelKey = cleanString(body?.channelKey, 40);
    const externalSku = cleanString(body?.externalSku, 64);
    const itemId = cleanString(body?.itemId, 80);
    if (!channelKey || !externalSku || !itemId) return NextResponse.json({ error: "invalid_mapping" }, { status: 400 });
    await db.insert(channelSkuMappings)
      .values({ companyId: context.company.id, channelKey, externalSku, itemId })
      .onConflictDoUpdate({ target: [channelSkuMappings.companyId, channelSkuMappings.channelKey, channelSkuMappings.externalSku], set: { itemId, updatedAt: new Date() } });
    await reevaluatePending(context.company.id, channelKey);
    return NextResponse.json(await listImports(context.company.id));
  }

  if (action === "discard") {
    const importId = cleanString(body?.importId, 80);
    if (!importId) return NextResponse.json({ error: "invalid_import" }, { status: 400 });
    await db.update(importOrders).set({ status: "discarded", updatedAt: new Date() })
      .where(and(eq(importOrders.companyId, context.company.id), eq(importOrders.id, importId)));
    return NextResponse.json(await listImports(context.company.id));
  }

  if (action === "shipment") {
    const importId = cleanString(body?.importId, 80);
    if (!importId) return NextResponse.json({ error: "invalid_import" }, { status: 400 });
    const [row] = await db.select().from(importOrders).where(and(eq(importOrders.companyId, context.company.id), eq(importOrders.id, importId))).limit(1);
    if (!row) return NextResponse.json({ error: "import_not_found" }, { status: 404 });
    if (row.status === "imported") return NextResponse.json({ error: "import_already_done" }, { status: 409 });
    const payload = row.rawPayload as Record<string, unknown>;
    await db.update(importOrders).set({
      rawPayload: {
        ...payload,
        tracking: cleanString(body?.tracking, 120),
        labelPdfUrl: cleanString(body?.labelPdfUrl, 500),
      },
      updatedAt: new Date(),
    }).where(eq(importOrders.id, importId));
    return NextResponse.json(await listImports(context.company.id));
  }

  if (action === "import" || action === "import_all") {
    let ids: string[] = [];
    if (action === "import") {
      const importId = cleanString(body?.importId, 80);
      if (!importId) return NextResponse.json({ error: "invalid_import" }, { status: 400 });
      ids = [importId];
    } else {
      const ready = await db.select({ id: importOrders.id })
        .from(importOrders)
        .where(and(eq(importOrders.companyId, context.company.id), eq(importOrders.status, "ready")));
      ids = ready.map((r) => r.id);
    }
    let imported = 0;
    for (const id of ids) {
      const result = await importOne(context.company.id, context.user.id, id);
      if (result.ok) imported += 1;
    }
    return NextResponse.json({ ...(await listImports(context.company.id)), imported });
  }

  return NextResponse.json({ error: "invalid_action" }, { status: 400 });
}
