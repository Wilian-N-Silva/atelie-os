import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, customers, financeEntries, items, orders, suppliers } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { toCsv, type CsvValue } from "@/lib/csv";
import { emptyStockBalance, getStockBalancesForCompany } from "@/lib/stock-balances";

export const runtime = "nodejs";

const EXPORTS = ["items", "stock", "orders", "customers", "suppliers", "finance"] as const;
type ExportEntity = (typeof EXPORTS)[number];

function num(value: unknown) {
  return value == null ? "" : Number(value);
}

async function buildExport(companyId: string, entity: ExportEntity): Promise<{ headers: string[]; rows: CsvValue[][] }> {
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
    const rows = await db.select().from(orders).where(eq(orders.companyId, companyId)).orderBy(desc(orders.createdAt));
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
  const rows = await db.select().from(financeEntries).where(eq(financeEntries.companyId, companyId)).orderBy(desc(financeEntries.createdAt));
  return {
    headers: ["Tipo", "Status", "Descricao", "Valor", "Vencimento", "Pago em", "Criado em"],
    rows: rows.map((r) => [r.type, r.status, r.description, num(r.amount), r.dueAt ?? "", r.paidAt ?? "", r.createdAt ? r.createdAt.toISOString() : ""]),
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const entity = new URL(request.url).searchParams.get("entity");
  if (!entity || !EXPORTS.includes(entity as ExportEntity)) {
    return Response.json({ error: "invalid_export", allowed: EXPORTS }, { status: 400 });
  }

  const { headers, rows } = await buildExport(context.company.id, entity as ExportEntity);
  const csv = toCsv(headers, rows);

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "report.export",
    entityType: "export",
    entityId: entity,
    metadata: { entity, rows: rows.length },
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
