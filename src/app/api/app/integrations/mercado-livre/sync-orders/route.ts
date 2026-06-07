import { and, eq, inArray, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs, channelSkuMappings, importOrders, items } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  getMercadoLivreRecentOrders,
  MERCADO_LIVRE_PROVIDER,
  type MercadoLivreImportLine,
} from "@/lib/mercado-livre-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type MappingInfo = { itemId: string; sku: string };

function cleanLimit(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.trunc(parsed), 1), 50) : 20;
}

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

async function autoMapInternalSkus(companyId: string, channelKey: string, externalSkus: string[], mappings: Map<string, MappingInfo>) {
  const missing = [...new Set(externalSkus)].filter((sku) => sku && !mappings.has(sku));
  if (!missing.length) return 0;

  const rows = await db
    .select({ id: items.id, sku: items.sku, internalCode: items.internalCode })
    .from(items)
    .where(and(
      eq(items.companyId, companyId),
      or(inArray(items.sku, missing), inArray(items.internalCode, missing)),
    ));

  let created = 0;
  for (const externalSku of missing) {
    const match = rows.find((item) => item.sku === externalSku || item.internalCode === externalSku);
    if (!match) continue;
    await db.insert(channelSkuMappings).values({
      companyId,
      channelKey,
      externalSku,
      itemId: match.id,
      externalTitle: null,
    }).onConflictDoNothing({
      target: [channelSkuMappings.companyId, channelSkuMappings.channelKey, channelSkuMappings.externalSku],
    });
    mappings.set(externalSku, { itemId: match.id, sku: match.sku });
    created += 1;
  }

  return created;
}

function unmappedSkus(lines: MercadoLivreImportLine[], mappings: Map<string, MappingInfo>) {
  return [...new Set(lines.map((line) => line.sku))].filter((sku) => !mappings.has(sku));
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as { limit?: unknown } | null;
  const limit = cleanLimit(body?.limit);
  const channelKey = MERCADO_LIVRE_PROVIDER;
  const result = await getMercadoLivreRecentOrders(context.company.id, limit);
  if (!result.ok) {
    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "import.run",
      entityType: "integration",
      entityId: channelKey,
      metadata: { provider: channelKey, step: "sync_orders", ok: false, status: result.status },
    });
    return NextResponse.json({ error: "mercado_livre_sync_failed", status: result.status }, { status: 502 });
  }

  const mappings = await channelMappings(context.company.id, channelKey);
  const autoMapped = await autoMapInternalSkus(
    context.company.id,
    channelKey,
    result.orders.flatMap((order) => order.lines.map((line) => line.sku)),
    mappings,
  );
  const existing = await db
    .select({ externalOrderId: importOrders.externalOrderId })
    .from(importOrders)
    .where(and(eq(importOrders.companyId, context.company.id), eq(importOrders.channelKey, channelKey)));
  const seen = new Set(existing.map((row) => row.externalOrderId));

  let created = 0;
  let skipped = 0;
  for (const order of result.orders) {
    if (seen.has(order.externalOrderId)) {
      skipped += 1;
      continue;
    }
    const unmapped = unmappedSkus(order.lines, mappings);
    await db.insert(importOrders).values({
      companyId: context.company.id,
      channelKey,
      externalOrderId: order.externalOrderId,
      buyerName: order.buyerName,
      buyerEmail: order.buyerEmail,
      status: unmapped.length ? "pending" : "ready",
      errorReason: unmapped.length ? `SKU nao mapeado: ${unmapped.join(", ")}` : null,
      total: order.total.toString(),
      rawPayload: {
        provider: channelKey,
        buyerName: order.buyerName,
        buyerEmail: order.buyerEmail,
        lines: order.lines,
        mercadoLivre: order.rawPayload,
      },
      createdByUserId: context.user.id,
    });
    seen.add(order.externalOrderId);
    created += 1;
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "import.run",
    entityType: "integration",
    entityId: channelKey,
    metadata: {
      provider: channelKey,
      step: "sync_orders",
      ok: true,
      status: result.status,
      fetched: result.orders.length,
      created,
      skipped,
      refreshed: result.refreshed,
      autoMapped,
    },
  });

  return NextResponse.json({
    provider: channelKey,
    fetched: result.orders.length,
    created,
    skipped,
    refreshed: result.refreshed,
    autoMapped,
  });
}
