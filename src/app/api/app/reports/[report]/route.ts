import { NextResponse } from "next/server";
import { and, desc, eq, gte, lte } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, financeEntries, items, orderItems, orders, productionOrders, purchases, stockMovements, suppliers } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { toCsv, type CsvValue } from "@/lib/csv";

export const runtime = "nodejs";

function csvResponse(name: string, body: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}.csv"`,
    },
  });
}

function num(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function money(value: number) {
  return Math.round(value * 100) / 100;
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

export async function GET(request: Request, { params }: { params: Promise<{ report: string }> }) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, ["owner", "admin"]);
  if (roleError) return roleError;

  const { report } = await params;
  const range = dateRange(new URL(request.url));
  let body = "";

  if (report === "stock-ledger") {
    const rows = await db
      .select({
        occurredAt: stockMovements.occurredAt,
        sku: items.sku,
        itemName: items.name,
        movementType: stockMovements.movementType,
        quantity: stockMovements.quantity,
        reason: stockMovements.reason,
        sourceType: stockMovements.sourceType,
        sourceId: stockMovements.sourceId,
      })
      .from(stockMovements)
      .innerJoin(items, eq(stockMovements.itemId, items.id))
      .where(and(eq(stockMovements.companyId, context.company.id), ...timestampFilters(stockMovements.occurredAt, range)))
      .orderBy(desc(stockMovements.occurredAt))
      .limit(1000);
    body = toCsv(["data", "sku", "item", "tipo", "quantidade", "motivo", "origem", "origem_id"], rows.map((row) => [
      row.occurredAt.toISOString(), row.sku, row.itemName, row.movementType, row.quantity, row.reason, row.sourceType, row.sourceId,
    ]));
  } else if (report === "orders") {
    const rows = await db.select().from(orders).where(and(eq(orders.companyId, context.company.id), ...timestampFilters(orders.createdAt, range))).orderBy(desc(orders.createdAt)).limit(1000);
    body = toCsv(["data", "numero", "cliente", "cidade", "status", "pagamento", "total"], rows.map((row) => [
      row.createdAt.toISOString(), row.number, row.customerName, row.city, row.status, row.paymentStatus, row.total,
    ]));
  } else if (report === "purchases") {
    const rows = await db
      .select({
        receivedAt: purchases.receivedAt,
        number: purchases.number,
        supplierName: suppliers.name,
        status: purchases.status,
        reference: purchases.reference,
        total: purchases.total,
      })
      .from(purchases)
      .leftJoin(suppliers, eq(purchases.supplierId, suppliers.id))
      .where(and(eq(purchases.companyId, context.company.id), ...timestampFilters(purchases.receivedAt, range)))
      .orderBy(desc(purchases.receivedAt))
      .limit(1000);
    body = toCsv(["data", "numero", "fornecedor", "status", "referencia", "total"], rows.map((row) => [
      row.receivedAt.toISOString(), row.number, row.supplierName, row.status, row.reference, row.total,
    ]));
  } else if (report === "finance") {
    const rows = await db.select().from(financeEntries).where(and(eq(financeEntries.companyId, context.company.id), ...timestampFilters(financeEntries.createdAt, range))).orderBy(desc(financeEntries.createdAt)).limit(1000);
    body = toCsv(["data", "tipo", "status", "descricao", "valor", "vencimento", "pagamento", "origem"], rows.map((row) => [
      row.createdAt.toISOString(), row.type, row.status, row.description, row.amount, row.dueAt, row.paidAt, row.sourceType,
    ]));
  } else if (report === "audit") {
    const rows = await db.select().from(auditLogs).where(and(eq(auditLogs.companyId, context.company.id), ...timestampFilters(auditLogs.createdAt, range))).orderBy(desc(auditLogs.createdAt)).limit(1000);
    body = toCsv(["data", "acao", "entidade", "entidade_id", "ator_id", "metadata"], rows.map((row) => [
      row.createdAt.toISOString(), row.action, row.entityType, row.entityId, row.actorUserId, JSON.stringify(row.metadata),
    ]));
  } else if (report === "order-lines") {
    const rows = await db
      .select({
        orderNumber: orders.number,
        createdAt: orders.createdAt,
        sku: orderItems.sku,
        quantity: orderItems.quantity,
        unitPrice: orderItems.unitPrice,
      })
      .from(orderItems)
      .innerJoin(orders, eq(orderItems.orderId, orders.id))
      .where(and(eq(orders.companyId, context.company.id), ...timestampFilters(orders.createdAt, range)))
      .orderBy(desc(orders.createdAt))
      .limit(1000);
    body = toCsv(["data", "pedido", "sku", "quantidade", "valor_unitario"], rows.map((row) => [
      row.createdAt.toISOString(), row.orderNumber, row.sku, row.quantity, row.unitPrice,
    ]));
  } else if (report === "sales-summary") {
    const rows = await db.select().from(orders).where(and(eq(orders.companyId, context.company.id), ...timestampFilters(orders.createdAt, range))).orderBy(desc(orders.createdAt)).limit(5000);
    const grouped = new Map<string, { orders: number; gross: number; freight: number; discount: number }>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      const current = grouped.get(key) ?? { orders: 0, gross: 0, freight: 0, discount: 0 };
      current.orders += 1;
      current.gross += num(row.total);
      current.freight += num(row.freight);
      current.discount += num(row.discount);
      grouped.set(key, current);
    }
    body = toCsv(["data", "pedidos", "total", "frete", "desconto"], [...grouped].sort().map(([date, row]) => [date, row.orders, money(row.gross), money(row.freight), money(row.discount)]));
  } else if (report === "production-summary") {
    const rows = await db.select().from(productionOrders).where(and(eq(productionOrders.companyId, context.company.id), ...timestampFilters(productionOrders.createdAt, range))).orderBy(desc(productionOrders.createdAt)).limit(5000);
    const grouped = new Map<string, { ops: number; planned: number; released: number; review: number; cure: number }>();
    for (const row of rows) {
      const key = row.createdAt.toISOString().slice(0, 10);
      const current = grouped.get(key) ?? { ops: 0, planned: 0, released: 0, review: 0, cure: 0 };
      current.ops += 1;
      current.planned += num(row.planned);
      if (row.status === "liberada" || row.status === "finalizada") current.released += num(row.planned);
      if (row.status === "aguardando_revisao") current.review += 1;
      if (row.status === "em_cura") current.cure += 1;
      grouped.set(key, current);
    }
    body = toCsv(["data", "ops", "planejado", "liberado_estimado", "em_revisao", "em_cura"], [...grouped].sort().map(([date, row]) => [date, row.ops, row.planned, row.released, row.review, row.cure]));
  } else if (report === "purchase-summary") {
    const rows = await db.select().from(purchases).where(and(eq(purchases.companyId, context.company.id), ...timestampFilters(purchases.receivedAt, range))).orderBy(desc(purchases.receivedAt)).limit(5000);
    const grouped = new Map<string, { purchases: number; total: number; paid: number; pending: number }>();
    for (const row of rows) {
      const key = row.receivedAt.toISOString().slice(0, 10);
      const current = grouped.get(key) ?? { purchases: 0, total: 0, paid: 0, pending: 0 };
      current.purchases += 1;
      current.total += num(row.total);
      if (row.status === "paid" || row.status === "pago") current.paid += num(row.total);
      else current.pending += num(row.total);
      grouped.set(key, current);
    }
    body = toCsv(["data", "compras", "total", "pago", "pendente"], [...grouped].sort().map(([date, row]) => [date, row.purchases, money(row.total), money(row.paid), money(row.pending)]));
  } else {
    return NextResponse.json({ error: "unknown_report" }, { status: 404 });
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "report.export",
    entityType: "report",
    entityId: report,
    metadata: { report, from: range.fromDate?.toISOString() ?? null, to: range.toDate?.toISOString() ?? null },
  });

  return csvResponse(`atelie-os-${report}`, body);
}
