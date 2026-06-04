import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companySettings } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { DEMO_ORDERS, ORDER_STATUS, type DemoOrder } from "@/lib/screen-fixtures";

export const runtime = "nodejs";

type DemoOrderOverride = Partial<Pick<DemoOrder, "payment" | "status">>;
type DemoOrderSettings = Record<string, unknown> & {
  demoOrderOverrides?: Record<string, DemoOrderOverride>;
  demoCustomOrders?: DemoOrder[];
};

const CHANNELS = ["instagram", "whatsapp", "mercadolivre", "shopee", "feira", "direta"] as const;
const PAYMENTS = ["pago", "aguardando"] as const;
const LABEL_KINDS = ["internal", "pdf_attached"] as const;

async function ensureCompanySettings(companyId: string) {
  const existing = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(companySettings)
    .values({ companyId })
    .returning();
  return created;
}

function isOrderStatus(value: unknown): value is DemoOrder["status"] {
  return typeof value === "string" && value in ORDER_STATUS;
}

function isPayment(value: unknown): value is DemoOrder["payment"] {
  return PAYMENTS.includes(value as DemoOrder["payment"]);
}

function isChannel(value: unknown): value is DemoOrder["channel"] {
  return CHANNELS.includes(value as DemoOrder["channel"]);
}

function isLabelKind(value: unknown): value is NonNullable<DemoOrder["labelKind"]> {
  return LABEL_KINDS.includes(value as NonNullable<DemoOrder["labelKind"]>);
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

function cleanOrder(value: unknown): DemoOrder | null {
  if (!value || typeof value !== "object") return null;
  const input = value as DemoOrder;
  const id = cleanString(input.id, 80);
  const code = cleanString(input.code, 12);
  const num = cleanString(input.num, 32);
  const customerName = cleanString(input.customerName, 120);
  const city = cleanString(input.city, 120);
  const createdAt = cleanString(input.createdAt, 40) || "agora";

  if (!id || !/^\d{12}$/.test(code) || !num || !customerName || !city) return null;
  if (!isChannel(input.channel) || !isOrderStatus(input.status) || !isPayment(input.payment)) return null;
  if (input.labelKind != null && !isLabelKind(input.labelKind)) return null;
  if (!Array.isArray(input.items) || !input.items.length) return null;

  const items = input.items
    .map((line) => ({
      sku: cleanString(line.sku, 64).toUpperCase(),
      qty: Math.max(1, Math.round(Number(line.qty) || 1)),
      unitPrice: line.unitPrice == null ? undefined : cleanMoney(line.unitPrice),
    }))
    .filter((line) => line.sku);

  if (!items.length) return null;

  return {
    id,
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
    items,
    tracking: cleanNullableString(input.tracking, 80),
    note: cleanNullableString(input.note, 500),
  };
}

function cleanOverride(value: unknown): DemoOrderOverride | null {
  if (!value || typeof value !== "object") return null;
  const input = value as DemoOrderOverride;
  const override: DemoOrderOverride = {};
  if (input.payment !== undefined) {
    if (!isPayment(input.payment)) return null;
    override.payment = input.payment;
  }
  if (input.status !== undefined) {
    if (!isOrderStatus(input.status)) return null;
    override.status = input.status;
  }
  return override;
}

function applyOrders(settings: DemoOrderSettings) {
  const custom = Array.isArray(settings.demoCustomOrders) ? settings.demoCustomOrders.map(cleanOrder).filter((order): order is DemoOrder => Boolean(order)) : [];
  const customIds = new Set(custom.map((order) => order.id));
  const base = [...custom, ...DEMO_ORDERS.filter((order) => !customIds.has(order.id))];
  const overrides = settings.demoOrderOverrides ?? {};
  return base.map((order) => ({ ...order, ...(overrides[order.id] ?? {}) }));
}

async function saveSettings(companyId: string, settings: DemoOrderSettings) {
  await db
    .update(companySettings)
    .set({ settings, updatedAt: new Date() })
    .where(eq(companySettings.companyId, companyId));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const row = await ensureCompanySettings(contextResult.context.company.id);
  return NextResponse.json({ orders: applyOrders(row.settings as DemoOrderSettings) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const body = await request.json().catch(() => null) as { order?: unknown } | null;
  const order = cleanOrder(body?.order);
  if (!order) return NextResponse.json({ error: "invalid_order" }, { status: 400 });

  const row = await ensureCompanySettings(contextResult.context.company.id);
  const settings = row.settings as DemoOrderSettings;
  const current = Array.isArray(settings.demoCustomOrders) ? settings.demoCustomOrders.map(cleanOrder).filter((item): item is DemoOrder => Boolean(item)) : [];
  const nextSettings: DemoOrderSettings = {
    ...settings,
    demoCustomOrders: [order, ...current.filter((item) => item.id !== order.id)],
  };

  await saveSettings(contextResult.context.company.id, nextSettings);
  return NextResponse.json({ orders: applyOrders(nextSettings) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const body = await request.json().catch(() => null) as {
    orderId?: unknown;
    override?: unknown;
  } | null;
  const orderId = cleanString(body?.orderId, 80);
  const override = cleanOverride(body?.override);
  if (!orderId || !override) return NextResponse.json({ error: "invalid_override" }, { status: 400 });

  const row = await ensureCompanySettings(contextResult.context.company.id);
  const settings = row.settings as DemoOrderSettings;
  const nextSettings: DemoOrderSettings = {
    ...settings,
    demoOrderOverrides: {
      ...(settings.demoOrderOverrides ?? {}),
      [orderId]: {
        ...(settings.demoOrderOverrides?.[orderId] ?? {}),
        ...override,
      },
    },
  };

  await saveSettings(contextResult.context.company.id, nextSettings);
  return NextResponse.json({ orders: applyOrders(nextSettings) });
}
