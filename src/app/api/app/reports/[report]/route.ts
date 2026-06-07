import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, financeEntries, items, orderItems, orders, purchases, stockMovements, suppliers } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

function csvValue(value: unknown) {
  const text = value == null ? "" : String(value);
  return /[",\n\r;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function csv(headers: string[], rows: unknown[][]) {
  return [headers, ...rows].map((row) => row.map(csvValue).join(";")).join("\n");
}

function csvResponse(name: string, body: string) {
  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="${name}.csv"`,
    },
  });
}

export async function GET(request: Request, { params }: { params: Promise<{ report: string }> }) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, ["owner", "admin"]);
  if (roleError) return roleError;

  const { report } = await params;
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
      .where(eq(stockMovements.companyId, context.company.id))
      .orderBy(desc(stockMovements.occurredAt))
      .limit(1000);
    body = csv(["data", "sku", "item", "tipo", "quantidade", "motivo", "origem", "origem_id"], rows.map((row) => [
      row.occurredAt.toISOString(), row.sku, row.itemName, row.movementType, row.quantity, row.reason, row.sourceType, row.sourceId,
    ]));
  } else if (report === "orders") {
    const rows = await db.select().from(orders).where(eq(orders.companyId, context.company.id)).orderBy(desc(orders.createdAt)).limit(1000);
    body = csv(["data", "numero", "cliente", "cidade", "status", "pagamento", "total"], rows.map((row) => [
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
      .where(eq(purchases.companyId, context.company.id))
      .orderBy(desc(purchases.receivedAt))
      .limit(1000);
    body = csv(["data", "numero", "fornecedor", "status", "referencia", "total"], rows.map((row) => [
      row.receivedAt.toISOString(), row.number, row.supplierName, row.status, row.reference, row.total,
    ]));
  } else if (report === "finance") {
    const rows = await db.select().from(financeEntries).where(eq(financeEntries.companyId, context.company.id)).orderBy(desc(financeEntries.createdAt)).limit(1000);
    body = csv(["data", "tipo", "status", "descricao", "valor", "vencimento", "pagamento", "origem"], rows.map((row) => [
      row.createdAt.toISOString(), row.type, row.status, row.description, row.amount, row.dueAt, row.paidAt, row.sourceType,
    ]));
  } else if (report === "audit") {
    const rows = await db.select().from(auditLogs).where(eq(auditLogs.companyId, context.company.id)).orderBy(desc(auditLogs.createdAt)).limit(1000);
    body = csv(["data", "acao", "entidade", "entidade_id", "ator_id", "metadata"], rows.map((row) => [
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
      .where(eq(orders.companyId, context.company.id))
      .orderBy(desc(orders.createdAt))
      .limit(1000);
    body = csv(["data", "pedido", "sku", "quantidade", "valor_unitario"], rows.map((row) => [
      row.createdAt.toISOString(), row.orderNumber, row.sku, row.quantity, row.unitPrice,
    ]));
  } else {
    return NextResponse.json({ error: "unknown_report" }, { status: 404 });
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "report.export",
    entityType: "report",
    entityId: report,
    metadata: { report },
  });

  return csvResponse(`atelie-os-${report}`, body);
}
