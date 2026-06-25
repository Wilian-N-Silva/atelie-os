import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db/client";
import {
  aiGenerations,
  auditLogs,
  customers,
  financeEntries,
  items,
  orders,
  productionOrders,
  recipeComponents,
  recipes,
  recipeVersions,
  stockMovements,
  suppliers,
} from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { toCsv, type CsvValue } from "@/lib/csv";
import { emptyStockBalance, getStockBalancesForCompany } from "@/lib/stock-balances";

export const runtime = "nodejs";

const EXPORTS = ["items", "stock", "orders", "customers", "suppliers", "finance", "lots", "movements", "recipes", "production", "ai-history"] as const;
type ExportEntity = (typeof EXPORTS)[number];

function num(value: unknown) {
  return value == null ? "" : Number(value);
}

function dateRange(url: URL) {
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const fromDate = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? new Date(`${from}T00:00:00.000Z`) : null;
  const toDate = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? new Date(`${to}T23:59:59.999Z`) : null;
  return { fromDate, toDate };
}

function timestampFilters(column: unknown, range: ReturnType<typeof dateRange>) {
  return [
    range.fromDate ? gte(column as never, range.fromDate) : undefined,
    range.toDate ? lte(column as never, range.toDate) : undefined,
  ].filter(Boolean);
}

async function buildExport(companyId: string, entity: ExportEntity, range: ReturnType<typeof dateRange>): Promise<{ headers: string[]; rows: CsvValue[][] }> {
  if (entity === "items") {
    const rows = await db.select().from(items).where(eq(items.companyId, companyId)).orderBy(items.name);
    return {
      headers: ["SKU", "Codigo interno", "Nome", "Variante", "Tipo", "Preco atual", "Custo medio", "Estoque minimo", "Vendavel", "Status"],
      rows: rows.map((r) => [r.sku, r.internalCode, r.name, r.variant ?? "", r.type, num(r.currentPrice), num(r.averageCost), num(r.minStock), r.sellable ? "sim" : "nao", r.status]),
    };
  }
  if (entity === "stock") {
    const [rows, balances] = await Promise.all([
      db.select({ id: items.id, sku: items.sku, name: items.name, min: items.minStock }).from(items).where(eq(items.companyId, companyId)).orderBy(items.name),
      getStockBalancesForCompany(companyId),
    ]);
    return {
      headers: ["SKU", "Nome", "Fisico", "Reservado", "Disponivel", "Bloqueado", "Em cura", "Minimo"],
      rows: rows.map((r) => {
        const b = balances.get(r.id) ?? emptyStockBalance();
        return [r.sku, r.name, b.physical, b.reserved, b.available, b.blocked, b.inCure, num(r.min)];
      }),
    };
  }
  if (entity === "orders") {
    const rows = await db.select().from(orders).where(and(eq(orders.companyId, companyId), ...timestampFilters(orders.createdAt, range))).orderBy(desc(orders.createdAt));
    return {
      headers: ["Numero", "Codigo", "Cliente", "Cidade", "Canal", "Status", "Pagamento", "Total", "Frete", "Rastreio", "Criado em"],
      rows: rows.map((r) => [r.number, r.code, r.customerName, r.city, r.channelKey, r.status, r.paymentStatus, num(r.total), num(r.freight), r.tracking ?? "", r.createdAt ? r.createdAt.toISOString() : ""]),
    };
  }
  if (entity === "customers") {
    const rows = await db.select().from(customers).where(eq(customers.companyId, companyId)).orderBy(customers.name);
    return {
      headers: ["Nome", "Email", "Telefone", "Documento", "Cidade", "UF", "CEP", "Origem", "Status"],
      rows: rows.map((r) => [r.name, r.email ?? "", r.phone ?? "", r.document ?? "", r.city ?? "", r.stateAbbr ?? "", r.postalCode ?? "", r.source, r.status]),
    };
  }
  if (entity === "suppliers") {
    const rows = await db.select().from(suppliers).where(eq(suppliers.companyId, companyId)).orderBy(suppliers.name);
    return {
      headers: ["Nome", "Documento", "Email", "Telefone", "Status"],
      rows: rows.map((r) => [r.name, r.document ?? "", r.email ?? "", r.phone ?? "", r.status]),
    };
  }
  // finance
  if (entity === "finance") {
    const rows = await db.select().from(financeEntries).where(and(eq(financeEntries.companyId, companyId), ...timestampFilters(financeEntries.createdAt, range))).orderBy(desc(financeEntries.createdAt));
    return {
      headers: ["Tipo", "Status", "Descricao", "Valor", "Vencimento", "Pago em", "Criado em"],
      rows: rows.map((r) => [r.type, r.status, r.description, num(r.amount), r.dueAt ?? "", r.paidAt ?? "", r.createdAt ? r.createdAt.toISOString() : ""]),
    };
  }
  if (entity === "lots") {
    const rows = await db.select().from(productionOrders).where(and(eq(productionOrders.companyId, companyId), sql`${productionOrders.lot} is not null`, ...timestampFilters(productionOrders.createdAt, range))).orderBy(desc(productionOrders.createdAt));
    return {
      headers: ["Lote", "OP", "Codigo OP", "Produto", "SKU", "Planejado", "Status", "Cura ate", "Criado em"],
      rows: rows.map((r) => [r.lot ?? "", r.number, r.code, r.productName, r.productSku, num(r.planned), r.status, r.cureUntil ?? "", r.createdAt.toISOString()]),
    };
  }
  if (entity === "movements") {
    const rows = await db
      .select({
        occurredAt: stockMovements.occurredAt,
        sku: items.sku,
        name: items.name,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        sourceType: stockMovements.sourceType,
        sourceId: stockMovements.sourceId,
        metadata: stockMovements.metadata,
      })
      .from(stockMovements)
      .innerJoin(items, eq(stockMovements.itemId, items.id))
      .where(and(eq(stockMovements.companyId, companyId), ...timestampFilters(stockMovements.occurredAt, range)))
      .orderBy(desc(stockMovements.occurredAt));
    return {
      headers: ["Data", "SKU", "Item", "Tipo", "Quantidade", "Motivo", "Origem", "Origem ID", "Lote"],
      rows: rows.map((r) => [r.occurredAt.toISOString(), r.sku, r.name, r.movementType, num(r.quantity), r.reason ?? "", r.sourceType ?? "", r.sourceId ?? "", typeof r.metadata?.lot === "string" ? r.metadata.lot : typeof r.metadata?.materialLot === "string" ? r.metadata.materialLot : ""]),
    };
  }
  if (entity === "recipes") {
    const rows = await db
      .select({
        recipeName: recipes.name,
        productSku: recipes.productSku,
        productName: recipes.productName,
        version: recipeVersions.version,
        status: recipeVersions.status,
        yieldQty: recipeVersions.yieldQty,
        yieldUnit: recipeVersions.yieldUnit,
        cureDays: recipeVersions.cureDays,
        componentSku: recipeComponents.sku,
        componentName: recipeComponents.name,
        quantity: recipeComponents.quantity,
        unit: recipeComponents.unit,
        loss: recipeComponents.loss,
      })
      .from(recipes)
      .innerJoin(recipeVersions, eq(recipeVersions.recipeId, recipes.id))
      .leftJoin(recipeComponents, eq(recipeComponents.recipeVersionId, recipeVersions.id))
      .where(eq(recipes.companyId, companyId))
      .orderBy(recipes.name, recipeVersions.version, recipeComponents.position);
    return {
      headers: ["Receita", "Produto SKU", "Produto", "Versao", "Status", "Rendimento", "Unidade rendimento", "Cura dias", "Componente SKU", "Componente", "Quantidade", "Unidade", "Perda %"],
      rows: rows.map((r) => [r.recipeName, r.productSku, r.productName, r.version, r.status, num(r.yieldQty), r.yieldUnit, r.cureDays, r.componentSku ?? "", r.componentName ?? "", num(r.quantity), r.unit ?? "", num(r.loss)]),
    };
  }
  if (entity === "production") {
    const rows = await db.select().from(productionOrders).where(and(eq(productionOrders.companyId, companyId), ...timestampFilters(productionOrders.createdAt, range))).orderBy(desc(productionOrders.createdAt));
    return {
      headers: ["OP", "Codigo", "Produto", "SKU", "Receita", "Versao", "Planejado", "Status", "Responsavel", "Lote", "Cura ate", "Criado em"],
      rows: rows.map((r) => [r.number, r.code, r.productName, r.productSku, r.recipeName, r.recipeVersion, num(r.planned), r.status, r.responsible, r.lot ?? "", r.cureUntil ?? "", r.createdAt.toISOString()]),
    };
  }
  const rows = await db.select().from(aiGenerations).where(and(eq(aiGenerations.companyId, companyId), ...timestampFilters(aiGenerations.createdAt, range))).orderBy(desc(aiGenerations.createdAt));
  return {
    headers: ["Criado em", "Template", "Produto SKU", "Produto", "Provider", "Modelo", "Status", "Prompt", "Resultado"],
    rows: rows.map((r) => [r.createdAt.toISOString(), r.templateKey, r.productSku ?? "", r.productName ?? "", r.provider, r.model ?? "", r.status, r.prompt, r.output]),
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const url = new URL(request.url);
  const entity = url.searchParams.get("entity");
  if (!entity || !EXPORTS.includes(entity as ExportEntity)) {
    return Response.json({ error: "invalid_export", allowed: EXPORTS }, { status: 400 });
  }

  const range = dateRange(url);
  const { headers, rows } = await buildExport(context.company.id, entity as ExportEntity, range);
  const csv = toCsv(headers, rows);

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "report.export",
    entityType: "export",
    entityId: entity,
    metadata: { entity, rows: rows.length, from: range.fromDate?.toISOString() ?? null, to: range.toDate?.toISOString() ?? null },
  });

  const date = new Date().toISOString().slice(0, 10);
  return new Response(csv, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="atelie-${entity}-${date}.csv"`,
      "cache-control": "no-store",
    },
  });
}
