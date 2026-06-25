import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { companySettings, financeEntries, importOrders, integrationCredentials, items, orders, productionOrders } from "@/db/schema";
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
  action: { screen: string; filter?: string; tab?: string };
  actionLabel: string;
  ruleId?: string;
  critical?: boolean;
};

type NotificationSettings = {
  disabledRules: string[];
  mutedUntil: Record<string, string>;
};

const RULE_IDS = new Set([
  "stock-zero",
  "stock-below",
  "lots-review",
  "orders-separate",
  "finance-payable",
  "orders-stalled",
  "integrations-disconnected",
  "imports-pending",
  "pricing-low-margin",
]);

const CLOSED_ORDER_STATUSES = new Set(["enviado", "entregue", "cancelado"]);

function cleanNotificationSettings(value: unknown): NotificationSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const disabledRules = Array.isArray(raw.disabledRules)
    ? raw.disabledRules.map(String).filter((rule) => RULE_IDS.has(rule))
    : [];
  const mutedUntilRaw = raw.mutedUntil && typeof raw.mutedUntil === "object" ? raw.mutedUntil as Record<string, unknown> : {};
  const mutedUntil: Record<string, string> = {};
  for (const [rule, until] of Object.entries(mutedUntilRaw)) {
    if (RULE_IDS.has(rule) && typeof until === "string" && !Number.isNaN(Date.parse(until))) mutedUntil[rule] = until;
  }
  return { disabledRules: Array.from(new Set(disabledRules)), mutedUntil };
}

async function loadCompanySettings(companyId: string) {
  return db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
}

function notificationEnabled(notification: Notification, settings: NotificationSettings, now: Date) {
  const rule = notification.ruleId ?? notification.id;
  if (settings.disabledRules.includes(rule)) return false;
  const mutedUntil = settings.mutedUntil[rule];
  return !mutedUntil || Date.parse(mutedUntil) <= now.getTime();
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const companyId = contextResult.context.company.id;
  const now = new Date();
  const staleOrderCutoff = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  const settingsRowPromise = loadCompanySettings(companyId);
  const [itemRows, balances, production, orderRows, finance, imports, credentials, settingsRow] = await Promise.all([
    db.select({
      id: items.id,
      name: items.name,
      min: items.minStock,
      sellable: items.sellable,
      averageCost: items.averageCost,
      estimatedCost: items.estimatedCost,
      currentPrice: items.currentPrice,
    }).from(items).where(and(eq(items.companyId, companyId), eq(items.status, "active"))),
    getStockBalancesForCompany(companyId),
    db.select({ status: productionOrders.status, cureDayLeft: productionOrders.cureDayLeft }).from(productionOrders).where(eq(productionOrders.companyId, companyId)),
    db.select({ status: orders.status, paymentStatus: orders.paymentStatus, createdAt: orders.createdAt }).from(orders).where(eq(orders.companyId, companyId)),
    db.select({ type: financeEntries.type, status: financeEntries.status }).from(financeEntries).where(and(eq(financeEntries.companyId, companyId), inArray(financeEntries.status, ["pending", "pendente"]))),
    db.select({ status: importOrders.status }).from(importOrders).where(eq(importOrders.companyId, companyId)),
    db.select({ status: integrationCredentials.status, expiresAt: integrationCredentials.expiresAt }).from(integrationCredentials).where(eq(integrationCredentials.companyId, companyId)),
    settingsRowPromise,
  ]);
  const ruleSettings = cleanNotificationSettings(settingsRow?.settings?.notifications);

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
    notifications.push({ id: "stock-zero", ruleId: "stock-zero", group: "Estoque", severity: "critical", icon: "alertCircle", tone: "bad", title: `${zero} item(ns) zerados`, desc: "Itens sem saldo disponivel.", action: { screen: "reposicao" }, actionLabel: "Ver reposicao", critical: true });
  }
  if (below > 0) {
    notifications.push({ id: "stock-below", ruleId: "stock-below", group: "Estoque", severity: "warning", icon: "alert", tone: "warn", title: `${below} item(ns) abaixo do minimo`, desc: "Considere repor antes de faltar.", action: { screen: "reposicao" }, actionLabel: "Ver reposicao" });
  }

  const review = production.filter((p) => p.status === "aguardando_revisao" || (p.status === "em_cura" && (p.cureDayLeft ?? 99) <= 0)).length;
  if (review > 0) {
    notifications.push({ id: "lots-review", ruleId: "lots-review", group: "Producao", severity: "warning", icon: "listChecks", tone: "cure", title: `${review} lote(s) para revisar`, desc: "Cura concluida ou aguardando liberacao.", action: { screen: "qualidade" }, actionLabel: "Abrir qualidade" });
  }

  const toSeparate = orderRows.filter((o) => o.paymentStatus === "pago" && (o.status === "pago" || o.status === "a_separar")).length;
  if (toSeparate > 0) {
    notifications.push({ id: "orders-separate", ruleId: "orders-separate", group: "Pedidos", severity: "warning", icon: "pedidos", tone: "warn", title: `${toSeparate} pedido(s) pago(s) a separar`, desc: "Pagos e aguardando separacao.", action: { screen: "pedidos", filter: "a_separar" }, actionLabel: "Ver pedidos" });
  }

  const payable = finance.filter((f) => f.type === "despesa" || f.type === "saida" || f.type === "expense").length;
  if (payable > 0) {
    notifications.push({ id: "finance-payable", ruleId: "finance-payable", group: "Financeiro", severity: "info", icon: "banknote", tone: "info", title: `${payable} conta(s) a pagar`, desc: "Despesas pendentes no financeiro.", action: { screen: "financeiro" }, actionLabel: "Ver financeiro" });
  }

  const stalledOrders = orderRows.filter((order) => !CLOSED_ORDER_STATUSES.has(order.status) && order.createdAt <= staleOrderCutoff).length;
  if (stalledOrders > 0) {
    notifications.push({ id: "orders-stalled", ruleId: "orders-stalled", group: "Pedidos", severity: "warning", icon: "clock", tone: "warn", title: `${stalledOrders} pedido(s) parados`, desc: "Pedidos abertos ha mais de 3 dias sem finalizacao.", action: { screen: "pedidos" }, actionLabel: "Ver pedidos" });
  }

  const disconnected = credentials.filter((credential) => credential.status !== "connected" || (credential.expiresAt && credential.expiresAt <= now)).length;
  if (disconnected > 0) {
    notifications.push({ id: "integrations-disconnected", ruleId: "integrations-disconnected", group: "Integracoes", severity: "warning", icon: "alertCircle", tone: "warn", title: `${disconnected} integracao(oes) desconectada(s)`, desc: "Reconecte para manter sincronizacoes e envios funcionando.", action: { screen: "configuracoes", tab: "shipping" }, actionLabel: "Abrir configuracoes" });
  }

  const pendingImports = imports.filter((row) => row.status === "pending" || row.status === "ready" || row.status === "error").length;
  if (pendingImports > 0) {
    notifications.push({ id: "imports-pending", ruleId: "imports-pending", group: "Importacoes", severity: "warning", icon: "inbox", tone: "warn", title: `${pendingImports} importacao(oes) pendente(s)`, desc: "Pedidos importados precisam de mapeamento ou revisao.", action: { screen: "importacoes" }, actionLabel: "Ver importacoes" });
  }

  const lowMargin = itemRows.filter((item) => {
    if (!item.sellable) return false;
    const price = Number(item.currentPrice);
    const cost = Number(item.averageCost ?? item.estimatedCost);
    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(cost) || cost <= 0) return false;
    return (price - cost) / price < 0.35;
  }).length;
  if (lowMargin > 0) {
    notifications.push({ id: "pricing-low-margin", ruleId: "pricing-low-margin", group: "Precificacao", severity: "info", icon: "trendDown", tone: "info", title: `${lowMargin} item(ns) com margem baixa`, desc: "Revise preco praticado, custo e margem minima.", action: { screen: "precificacao" }, actionLabel: "Abrir precificacao" });
  }

  return NextResponse.json({ notifications: notifications.filter((notification) => notificationEnabled(notification, ruleSettings, now)) });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { ruleId?: unknown; action?: unknown; days?: unknown } | null;
  const ruleId = typeof body?.ruleId === "string" && RULE_IDS.has(body.ruleId) ? body.ruleId : null;
  const action = typeof body?.action === "string" ? body.action : "";
  if (!ruleId || !["mute", "unmute", "disable", "enable"].includes(action)) {
    return NextResponse.json({ error: "invalid_rule_action" }, { status: 400 });
  }

  const current = await loadCompanySettings(context.company.id);
  const currentSettings = current?.settings ?? {};
  const notifications = cleanNotificationSettings(currentSettings.notifications);
  const disabled = new Set(notifications.disabledRules);
  const mutedUntil = { ...notifications.mutedUntil };

  if (action === "disable") disabled.add(ruleId);
  if (action === "enable") disabled.delete(ruleId);
  if (action === "mute") {
    const days = Number(body?.days);
    const duration = Number.isFinite(days) && days > 0 ? Math.min(30, days) : 7;
    mutedUntil[ruleId] = new Date(Date.now() + duration * 24 * 60 * 60 * 1000).toISOString();
  }
  if (action === "unmute") delete mutedUntil[ruleId];

  const nextSettings = {
    ...currentSettings,
    notifications: {
      disabledRules: Array.from(disabled),
      mutedUntil,
    },
  };

  await db.insert(companySettings)
    .values({ companyId: context.company.id, settings: nextSettings })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { settings: nextSettings, updatedAt: new Date() },
    });

  return NextResponse.json({ ok: true, settings: nextSettings.notifications });
}
