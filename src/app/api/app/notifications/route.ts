import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { financeEntries, items, orders, productionOrders } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { getStockBalancesForCompany, emptyStockBalance } from "@/lib/stock-balances";

export const runtime = "nodejs";

type Notification = {
  id: string;
  group: string;
  severity: "critical" | "warning" | "info";
  icon: string;
  tone: "ok" | "warn" | "info" | "bad" | "cure" | "neutral";
  title: string;
  desc: string;
  action: { screen: string; filter?: string };
  actionLabel: string;
  critical?: boolean;
};

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const companyId = contextResult.context.company.id;
  const [itemRows, balances, production, orderRows, finance] = await Promise.all([
    db.select({ id: items.id, name: items.name, min: items.minStock }).from(items).where(and(eq(items.companyId, companyId), eq(items.status, "active"))),
    getStockBalancesForCompany(companyId),
    db.select({ status: productionOrders.status, cureDayLeft: productionOrders.cureDayLeft }).from(productionOrders).where(eq(productionOrders.companyId, companyId)),
    db.select({ status: orders.status, paymentStatus: orders.paymentStatus }).from(orders).where(eq(orders.companyId, companyId)),
    db.select({ type: financeEntries.type, status: financeEntries.status }).from(financeEntries).where(and(eq(financeEntries.companyId, companyId), inArray(financeEntries.status, ["pending", "pendente"]))),
  ]);

  const notifications: Notification[] = [];

  let zero = 0;
  let below = 0;
  for (const item of itemRows) {
    const min = Number(item.min);
    if (!(min > 0)) continue;
    const available = (balances.get(item.id) ?? emptyStockBalance()).available;
    if (available <= 0) zero += 1;
    else if (available < min) below += 1;
  }
  if (zero > 0) {
    notifications.push({ id: "stock-zero", group: "Estoque", severity: "critical", icon: "alertCircle", tone: "bad", title: `${zero} item(ns) zerados`, desc: "Itens sem saldo disponivel.", action: { screen: "reposicao" }, actionLabel: "Ver reposicao", critical: true });
  }
  if (below > 0) {
    notifications.push({ id: "stock-below", group: "Estoque", severity: "warning", icon: "alert", tone: "warn", title: `${below} item(ns) abaixo do minimo`, desc: "Considere repor antes de faltar.", action: { screen: "reposicao" }, actionLabel: "Ver reposicao" });
  }

  const review = production.filter((p) => p.status === "aguardando_revisao" || (p.status === "em_cura" && (p.cureDayLeft ?? 99) <= 0)).length;
  if (review > 0) {
    notifications.push({ id: "lots-review", group: "Producao", severity: "warning", icon: "listChecks", tone: "cure", title: `${review} lote(s) para revisar`, desc: "Cura concluida ou aguardando liberacao.", action: { screen: "qualidade" }, actionLabel: "Abrir qualidade" });
  }

  const toSeparate = orderRows.filter((o) => o.paymentStatus === "pago" && (o.status === "pago" || o.status === "a_separar")).length;
  if (toSeparate > 0) {
    notifications.push({ id: "orders-separate", group: "Pedidos", severity: "warning", icon: "pedidos", tone: "warn", title: `${toSeparate} pedido(s) pago(s) a separar`, desc: "Pagos e aguardando separacao.", action: { screen: "pedidos", filter: "a_separar" }, actionLabel: "Ver pedidos" });
  }

  const payable = finance.filter((f) => f.type === "despesa" || f.type === "saida" || f.type === "expense").length;
  if (payable > 0) {
    notifications.push({ id: "finance-payable", group: "Financeiro", severity: "info", icon: "banknote", tone: "info", title: `${payable} conta(s) a pagar`, desc: "Despesas pendentes no financeiro.", action: { screen: "financeiro" }, actionLabel: "Ver financeiro" });
  }

  return NextResponse.json({ notifications });
}
