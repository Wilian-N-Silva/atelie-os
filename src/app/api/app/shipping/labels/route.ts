import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, items, orderItems, orders } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { type Order } from "@/lib/domain";
import {
  createMelhorEnvioCartShipment,
  runMelhorEnvioShipmentAction,
  type MelhorEnvioCartShipmentInput,
  type MelhorEnvioShipmentAction,
  readMelhorEnvioCredential,
} from "@/lib/shipping-integrations-server";

export const runtime = "nodejs";

type ShipmentAddressInput = MelhorEnvioCartShipmentInput["sender"];

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

function cleanDigits(value: unknown, max: number) {
  return cleanString(value, max + 8).replace(/\D/g, "").slice(0, max);
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function metadataShippingQuote(metadata: Record<string, unknown>): NonNullable<Order["shippingQuote"]> | null {
  const quote = metadata.shippingQuote;
  if (!quote || typeof quote !== "object") return null;
  const input = quote as NonNullable<Order["shippingQuote"]>;
  const serviceId = cleanString(input.serviceId, 40);
  const serviceName = cleanString(input.serviceName, 120);
  const price = cleanNumber(input.price);
  if (!serviceId || !serviceName || price <= 0) return null;
  return {
    provider: cleanString(input.provider, 40) || "melhor_envio",
    serviceId,
    serviceName,
    company: cleanNullableString(input.company, 80),
    price,
    deliveryTime: input.deliveryTime == null ? null : Math.max(0, Math.round(Number(input.deliveryTime) || 0)),
    selectedAt: cleanString(input.selectedAt, 40) || new Date().toISOString(),
  };
}

function metadataShippingLabel(metadata: Record<string, unknown>): NonNullable<Order["shippingLabel"]> | null {
  const label = metadata.shippingLabel;
  if (!label || typeof label !== "object") return null;
  const input = label as NonNullable<Order["shippingLabel"]>;
  const externalId = cleanString(input.externalId, 120);
  const serviceId = cleanString(input.serviceId, 40);
  const serviceName = cleanString(input.serviceName, 120);
  if (!externalId || !serviceId || !serviceName) return null;
  return {
    provider: cleanString(input.provider, 40) || "melhor_envio",
    externalId,
    protocol: cleanNullableString(input.protocol, 120),
    status: cleanNullableString(input.status, 80),
    serviceId,
    serviceName,
    company: cleanNullableString(input.company, 80),
    price: input.price == null ? null : cleanNumber(input.price),
    tracking: cleanNullableString(input.tracking, 120),
    trackingUrl: cleanNullableString(input.trackingUrl, 500),
    cartInsertedAt: cleanString(input.cartInsertedAt, 40) || new Date().toISOString(),
    checkoutAt: cleanNullableString(input.checkoutAt, 40),
    generatedAt: cleanNullableString(input.generatedAt, 40),
    previewUrl: cleanNullableString(input.previewUrl, 500),
    printUrl: cleanNullableString(input.printUrl, 500),
  };
}

function cleanAction(value: unknown): MelhorEnvioShipmentAction | null {
  return value === "checkout" || value === "generate" || value === "preview" || value === "print" ? value : null;
}

function nextLabelAfterAction(
  label: NonNullable<Order["shippingLabel"]>,
  action: MelhorEnvioShipmentAction,
  result: { url?: string | null; tracking?: string | null; trackingUrl?: string | null },
) {
  const now = new Date().toISOString();
  if (action === "checkout") return { ...label, status: "checkout", checkoutAt: now };
  if (action === "generate") {
    return {
      ...label,
      status: "generated",
      generatedAt: now,
      tracking: result.tracking ?? label.tracking,
      trackingUrl: result.trackingUrl ?? label.trackingUrl,
    };
  }
  if (action === "preview") return { ...label, previewUrl: result.url ?? label.previewUrl };
  return { ...label, printUrl: result.url ?? label.printUrl };
}

function isValidCpf(value: string) {
  const cpf = value.replace(/\D/g, "");
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;
  const calc = (length: number) => {
    let sum = 0;
    for (let index = 0; index < length; index += 1) sum += Number(cpf[index]) * (length + 1 - index);
    const digit = (sum * 10) % 11;
    return digit === 10 ? 0 : digit;
  };
  return calc(9) === Number(cpf[9]) && calc(10) === Number(cpf[10]);
}

function isValidCnpj(value: string) {
  const cnpj = value.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (weights: number[]) => {
    const sum = weights.reduce((total, weight, index) => total + Number(cnpj[index]) * weight, 0);
    const mod = sum % 11;
    return mod < 2 ? 0 : 11 - mod;
  };
  return calc([5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[12])
    && calc([6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]) === Number(cnpj[13]);
}

function cleanAddress(value: unknown): ShipmentAddressInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const documentType = input.documentType === "cnpj" ? "cnpj" : "cpf";
  const cpf = cleanDigits(input.document, 11);
  const cnpj = cleanDigits(input.companyDocument, 14);
  const name = cleanString(input.name, 120);
  const address = cleanString(input.address, 160);
  const number = cleanString(input.number, 20);
  const district = cleanString(input.district, 80);
  const city = cleanString(input.city, 80);
  const stateAbbr = cleanString(input.stateAbbr, 2).toUpperCase();
  const postalCode = cleanPostalCode(input.postalCode);
  if (!name || !address || !number || !district || !city || !/^[A-Z]{2}$/.test(stateAbbr) || postalCode.length !== 8) {
    return null;
  }
  if (documentType === "cpf" && !isValidCpf(cpf)) return null;
  if (documentType === "cnpj" && !isValidCnpj(cnpj)) return null;
  return {
    documentType,
    name,
    phone: cleanNullableString(cleanDigits(input.phone, 16), 16),
    email: cleanNullableString(input.email, 120),
    document: documentType === "cpf" ? cpf : null,
    companyDocument: documentType === "cnpj" ? cnpj : null,
    stateRegister: cleanNullableString(input.stateRegister, 40),
    address,
    complement: cleanNullableString(input.complement, 80),
    number,
    district,
    city,
    stateAbbr,
    postalCode,
    note: cleanNullableString(input.note, 120),
  };
}

async function orderProducts(companyId: string, orderId: string) {
  const rows = await db
    .select({
      sku: orderItems.sku,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      itemName: items.name,
      itemVariant: items.variant,
      currentPrice: items.currentPrice,
      suggestedPrice: items.suggestedPrice,
    })
    .from(orderItems)
    .leftJoin(items, and(eq(orderItems.itemId, items.id), eq(items.companyId, companyId)))
    .where(eq(orderItems.orderId, orderId));

  return rows.flatMap((row) => {
    const quantity = Number(row.quantity);
    const unitaryValue = Number(row.unitPrice ?? row.currentPrice ?? row.suggestedPrice);
    if (!Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(unitaryValue)) return [];
    const name = [row.itemName, row.itemVariant].filter(Boolean).join(" ").trim() || row.sku;
    return [{
      id: row.sku,
      name,
      quantity,
      unitaryValue: Math.max(0.01, Math.round(unitaryValue * 100) / 100),
    }];
  });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const orderId = cleanString(body?.orderId, 80);
  const sender = cleanAddress(body?.sender);
  const recipient = cleanAddress(body?.recipient);
  const volumeInput = body?.volume && typeof body.volume === "object" ? body.volume as Record<string, unknown> : {};
  const optionsInput = body?.options && typeof body.options === "object" ? body.options as Record<string, unknown> : {};
  const volume = {
    weightG: cleanNumber(volumeInput.weightG),
    lengthCm: cleanNumber(volumeInput.lengthCm),
    widthCm: cleanNumber(volumeInput.widthCm),
    heightCm: cleanNumber(volumeInput.heightCm),
  };
  const insuranceValue = cleanNumber(optionsInput.insuranceValue, 1);

  if (!orderId || !sender || !recipient || volume.weightG <= 0 || volume.lengthCm <= 0 || volume.widthCm <= 0 || volume.heightCm <= 0) {
    return NextResponse.json({
      error: "invalid_shipping_label",
      message: "Preencha remetente, destinatario, documento valido, CEP e dimensoes antes de gerar a etiqueta.",
    }, { status: 400 });
  }

  const credential = await readMelhorEnvioCredential(context.company.id);
  if (!credential.connected) return NextResponse.json({ error: "melhor_envio_disconnected" }, { status: 409 });

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)),
    columns: { id: true, number: true, metadata: true },
  });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const quote = metadataShippingQuote(order.metadata);
  if (!quote || quote.provider !== "melhor_envio") {
    return NextResponse.json({ error: "shipping_quote_required" }, { status: 409 });
  }

  const products = await orderProducts(context.company.id, orderId);
  if (!products.length) return NextResponse.json({ error: "order_items_required" }, { status: 409 });

  const result = await createMelhorEnvioCartShipment(context.company.id, {
    serviceId: quote.serviceId,
    sender: { ...sender, note: sender.note ?? `Pedido ${order.number}` },
    recipient: { ...recipient, note: recipient.note ?? `Pedido ${order.number}` },
    products,
    volume,
    options: {
      insuranceValue,
      receipt: Boolean(optionsInput.receipt),
      ownHand: Boolean(optionsInput.ownHand),
      nonCommercial: optionsInput.nonCommercial !== false,
      invoiceKey: cleanNullableString(optionsInput.invoiceKey, 80),
    },
  });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.update",
    entityType: "order",
    entityId: orderId,
    metadata: {
      provider: "melhor_envio",
      operation: "cart_insert",
      status: result.status,
      refreshed: result.refreshed,
      error: result.errorMessage ?? null,
    },
  });

  if (!result.shipment) {
    const reconnectMessage = result.status === 401 || result.status === 403
      ? "Reconecte o Melhor Envio para conceder o escopo de compra/insercao de etiquetas."
      : null;
    return Response.json({
      error: "melhor_envio_cart_failed",
      message: reconnectMessage ?? result.errorMessage ?? "Nao foi possivel inserir a etiqueta no carrinho do Melhor Envio.",
      providerStatus: result.status,
    }, { status: result.status === 401 || result.status === 403 ? 403 : 502 });
  }

  const shippingLabel: NonNullable<Order["shippingLabel"]> = {
    provider: "melhor_envio",
    externalId: result.shipment.id,
    protocol: result.shipment.protocol,
    status: result.shipment.status ?? "cart",
    serviceId: quote.serviceId,
    serviceName: quote.serviceName,
    company: quote.company,
    price: result.shipment.price ?? quote.price,
    tracking: result.shipment.tracking,
    trackingUrl: result.shipment.trackingUrl,
    cartInsertedAt: new Date().toISOString(),
  };

  await db.update(orders).set({
    metadata: {
      ...order.metadata,
      shippingLabel,
    },
    updatedAt: new Date(),
  }).where(and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)));

  return NextResponse.json({ shippingLabel });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const orderId = cleanString(body?.orderId, 80);
  const action = cleanAction(body?.action);
  if (!orderId || !action) return NextResponse.json({ error: "invalid_shipping_label_action" }, { status: 400 });

  const credential = await readMelhorEnvioCredential(context.company.id);
  if (!credential.connected) return NextResponse.json({ error: "melhor_envio_disconnected" }, { status: 409 });

  const order = await db.query.orders.findFirst({
    where: and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)),
    columns: { id: true, metadata: true },
  });
  if (!order) return NextResponse.json({ error: "order_not_found" }, { status: 404 });

  const label = metadataShippingLabel(order.metadata);
  if (!label || label.provider !== "melhor_envio") {
    return NextResponse.json({ error: "shipping_label_required" }, { status: 409 });
  }

  const result = await runMelhorEnvioShipmentAction(context.company.id, action, [label.externalId]);

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.update",
    entityType: "order",
    entityId: orderId,
    metadata: {
      provider: "melhor_envio",
      operation: action,
      providerStatus: result.status,
      refreshed: result.refreshed,
      error: result.errorMessage ?? null,
    },
  });

  if (!result.ok) {
    const reconnectMessage = result.status === 401 || result.status === 403
      ? "Reconecte o Melhor Envio para conceder os escopos de etiqueta."
      : null;
    return Response.json({
      error: "melhor_envio_label_action_failed",
      message: reconnectMessage ?? result.errorMessage ?? "Nao foi possivel atualizar a etiqueta no Melhor Envio.",
      providerStatus: result.status,
    }, { status: result.status === 401 || result.status === 403 ? 403 : 502 });
  }

  const shippingLabel = nextLabelAfterAction(label, action, result);
  await db.update(orders).set({
    metadata: {
      ...order.metadata,
      shippingLabel,
    },
    ...(action === "generate" && result.tracking ? { tracking: result.tracking } : {}),
    updatedAt: new Date(),
  }).where(and(eq(orders.companyId, context.company.id), eq(orders.id, orderId)));

  return NextResponse.json({ shippingLabel, url: result.url ?? null });
}
