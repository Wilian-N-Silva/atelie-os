import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  disconnectMelhorEnvio,
  getMelhorEnvioAccessToken,
  melhorEnvioOAuthConfigured,
  quoteMelhorEnvio,
  readMelhorEnvioCredential,
} from "@/lib/shipping-integrations-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type ShippingSettings = {
  melhorEnvioEnabled?: boolean;
  originZip?: string;
  originCity?: string;
  defaultService?: string;
  storeDocumentType?: "cpf" | "cnpj";
  storeDocument?: string;
  storeName?: string;
  senderName?: string;
  senderPhone?: string;
  senderEmail?: string;
  senderDocumentType?: "cpf" | "cnpj";
  senderDocument?: string;
  senderCompanyDocument?: string;
  senderStateRegister?: string;
  senderAddress?: string;
  senderNumber?: string;
  senderComplement?: string;
  senderDistrict?: string;
  senderStateAbbr?: string;
  fiscalRegime?: string;
  fiscalInvoiceDefault?: string;
  defaultShippingAddressId?: string;
  shippingAddresses?: ShippingAddressSettings[];
};

type ShippingAddressSettings = {
  id: string;
  label: string;
  name: string;
  phone: string;
  email: string;
  documentType: "cpf" | "cnpj";
  document: string;
  companyDocument: string;
  stateRegister: string;
  address: string;
  number: string;
  complement: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanDigits(value: unknown, max: number) {
  return cleanString(value, max + 8).replace(/\D/g, "").slice(0, max);
}

function cleanNumber(value: unknown, fallback = 0) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value.replace(",", ".")) : NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

function cleanSettings(value: unknown): ShippingSettings {
  return value && typeof value === "object" ? value as ShippingSettings : {};
}

function cleanDocumentType(value: unknown): "cpf" | "cnpj" {
  return value === "cnpj" ? "cnpj" : "cpf";
}

function cleanShippingAddress(value: unknown, index: number): ShippingAddressSettings | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const documentType = cleanDocumentType(input.documentType);
  const document = cleanDigits(input.document, 11);
  const companyDocument = cleanDigits(input.companyDocument, 14);
  const id = cleanString(input.id, 80) || `addr-${Date.now()}-${index}`;
  const label = cleanString(input.label, 80) || (index === 0 ? "Loja" : `Endereco ${index + 1}`);
  const postalCode = cleanDigits(input.postalCode, 8);
  return {
    id,
    label,
    name: cleanString(input.name, 120),
    phone: cleanDigits(input.phone, 16),
    email: cleanString(input.email, 120),
    documentType,
    document: documentType === "cpf" ? document : "",
    companyDocument: documentType === "cnpj" ? companyDocument : "",
    stateRegister: cleanString(input.stateRegister, 40),
    address: cleanString(input.address, 160),
    number: cleanString(input.number, 20),
    complement: cleanString(input.complement, 80),
    district: cleanString(input.district, 80),
    city: cleanString(input.city, 80),
    stateAbbr: cleanString(input.stateAbbr, 2).toUpperCase(),
    postalCode,
  };
}

function legacyShippingAddress(all: ShippingSettings): ShippingAddressSettings | null {
  if (!all.senderName && !all.senderAddress && !all.originZip) return null;
  const documentType = all.senderCompanyDocument ? "cnpj" : "cpf";
  return {
    id: "store",
    label: "Loja",
    name: all.senderName ?? all.storeName ?? "",
    phone: all.senderPhone ?? "",
    email: all.senderEmail ?? "",
    documentType,
    document: documentType === "cpf" ? all.senderDocument ?? "" : "",
    companyDocument: documentType === "cnpj" ? all.senderCompanyDocument ?? "" : "",
    stateRegister: all.senderStateRegister ?? "",
    address: all.senderAddress ?? "",
    number: all.senderNumber ?? "",
    complement: all.senderComplement ?? "",
    district: all.senderDistrict ?? "",
    city: all.originCity?.split("-")[0]?.trim() ?? "",
    stateAbbr: all.senderStateAbbr ?? all.originCity?.split("-")[1]?.trim().slice(0, 2).toUpperCase() ?? "",
    postalCode: all.originZip ?? "",
  };
}

function shippingAddresses(all: ShippingSettings) {
  const list = Array.isArray(all.shippingAddresses)
    ? all.shippingAddresses.map((item, index) => cleanShippingAddress(item, index)).filter((item): item is ShippingAddressSettings => !!item)
    : [];
  if (list.length) return list;
  const legacy = legacyShippingAddress(all);
  return legacy ? [legacy] : [];
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

function isCompleteShippingAddress(address: ShippingAddressSettings) {
  const document = address.documentType === "cnpj" ? address.companyDocument : address.document;
  const documentOk = address.documentType === "cnpj" ? isValidCnpj(document) : isValidCpf(document);
  return Boolean(
    address.label
      && address.name
      && address.phone.length >= 10
      && address.email.includes("@")
      && documentOk
      && address.address
      && address.number
      && address.district
      && address.city
      && /^[A-Z]{2}$/.test(address.stateAbbr)
      && address.postalCode.length === 8,
  );
}

function quoteSummary(services: Array<{ name: string; company: string | null; price: number; deliveryTime: number | null }>) {
  const best = services[0];
  if (!best) return "Nenhum servico disponivel para este pacote. Use o preenchimento manual.";
  const price = best.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const company = best.company ? `${best.company} - ` : "";
  const days = best.deliveryTime === null ? "" : ` em ate ${best.deliveryTime} dia(s)`;
  return `Melhor opcao: ${company}${best.name} por ${price}${days}.`;
}

async function getSettings(companyId: string) {
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
  const all = cleanSettings(row?.settings?.shipping);
  const credential = await readMelhorEnvioCredential(companyId);
  const addresses = shippingAddresses(all);
  const defaultAddress = addresses.find((address) => address.id === all.defaultShippingAddressId) ?? addresses[0] ?? null;
  return {
    melhorEnvioEnabled: !!all.melhorEnvioEnabled,
    hasMelhorEnvioToken: credential.connected,
    melhorEnvioConnected: credential.connected,
    melhorEnvioStatus: credential.status,
    melhorEnvioEnvironment: credential.environment,
    melhorEnvioExpiresAt: credential.expiresAt,
    melhorEnvioOAuthConfigured: melhorEnvioOAuthConfigured(),
    originZip: all.originZip ?? "",
    originCity: all.originCity ?? "",
    defaultService: all.defaultService ?? "manual",
    storeDocumentType: all.storeDocumentType ?? "cnpj",
    storeDocument: all.storeDocument ?? all.senderCompanyDocument ?? all.senderDocument ?? "",
    storeName: all.storeName ?? "",
    senderName: defaultAddress?.name ?? all.senderName ?? "",
    senderPhone: defaultAddress?.phone ?? all.senderPhone ?? "",
    senderEmail: defaultAddress?.email ?? all.senderEmail ?? "",
    senderDocumentType: defaultAddress?.documentType ?? all.senderDocumentType ?? "cpf",
    senderDocument: defaultAddress?.document ?? all.senderDocument ?? "",
    senderCompanyDocument: defaultAddress?.companyDocument ?? all.senderCompanyDocument ?? "",
    senderStateRegister: defaultAddress?.stateRegister ?? all.senderStateRegister ?? "",
    senderAddress: defaultAddress?.address ?? all.senderAddress ?? "",
    senderNumber: defaultAddress?.number ?? all.senderNumber ?? "",
    senderComplement: defaultAddress?.complement ?? all.senderComplement ?? "",
    senderDistrict: defaultAddress?.district ?? all.senderDistrict ?? "",
    senderStateAbbr: defaultAddress?.stateAbbr ?? all.senderStateAbbr ?? "",
    fiscalRegime: all.fiscalRegime ?? "",
    fiscalInvoiceDefault: all.fiscalInvoiceDefault ?? "",
    defaultShippingAddressId: defaultAddress?.id ?? "",
    shippingAddresses: addresses,
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ shipping: await getSettings(contextResult.context.company.id) });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const current = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, context.company.id),
  });
  if (!current) return NextResponse.json({ error: "settings_not_found" }, { status: 404 });

  const currentShipping = cleanSettings(current.settings.shipping);
  const addressesInput = Array.isArray(body?.shippingAddresses) ? body.shippingAddresses : [];
  const nextAddresses = addressesInput
    .map((item, index) => cleanShippingAddress(item, index))
    .filter((item): item is ShippingAddressSettings => !!item);
  const defaultAddress = nextAddresses.find((address) => address.id === cleanString(body?.defaultShippingAddressId, 80)) ?? nextAddresses[0] ?? null;
  const storeDocumentType = cleanDocumentType(body?.storeDocumentType);
  const nextShipping: ShippingSettings = {
    ...currentShipping,
    melhorEnvioEnabled: !!body?.melhorEnvioEnabled,
    originZip: defaultAddress?.postalCode ?? cleanDigits(body?.originZip, 8),
    originCity: defaultAddress ? `${defaultAddress.city}${defaultAddress.stateAbbr ? ` - ${defaultAddress.stateAbbr}` : ""}` : cleanString(body?.originCity, 80),
    defaultService: cleanString(body?.defaultService, 80) || "manual",
    storeDocumentType,
    storeDocument: storeDocumentType === "cnpj" ? cleanDigits(body?.storeDocument, 14) : cleanDigits(body?.storeDocument, 11),
    storeName: cleanString(body?.storeName, 120),
    senderName: defaultAddress?.name ?? cleanString(body?.senderName, 120),
    senderPhone: defaultAddress?.phone ?? cleanDigits(body?.senderPhone, 16),
    senderEmail: defaultAddress?.email ?? cleanString(body?.senderEmail, 120),
    senderDocumentType: defaultAddress?.documentType ?? cleanDocumentType(body?.senderDocumentType),
    senderDocument: defaultAddress?.document ?? cleanDigits(body?.senderDocument, 11),
    senderCompanyDocument: defaultAddress?.companyDocument ?? cleanDigits(body?.senderCompanyDocument, 14),
    senderStateRegister: defaultAddress?.stateRegister ?? cleanString(body?.senderStateRegister, 40),
    senderAddress: defaultAddress?.address ?? cleanString(body?.senderAddress, 160),
    senderNumber: defaultAddress?.number ?? cleanString(body?.senderNumber, 20),
    senderComplement: defaultAddress?.complement ?? cleanString(body?.senderComplement, 80),
    senderDistrict: defaultAddress?.district ?? cleanString(body?.senderDistrict, 80),
    senderStateAbbr: defaultAddress?.stateAbbr ?? cleanString(body?.senderStateAbbr, 2).toUpperCase(),
    fiscalRegime: cleanString(body?.fiscalRegime, 80),
    fiscalInvoiceDefault: cleanString(body?.fiscalInvoiceDefault, 80),
    defaultShippingAddressId: defaultAddress?.id ?? "",
    shippingAddresses: nextAddresses,
  };
  if (nextShipping.melhorEnvioEnabled && (!defaultAddress || !isCompleteShippingAddress(defaultAddress))) {
    return NextResponse.json({
      error: "invalid_shipping_sender",
      message: "Complete o endereco de expedicao padrao antes de ativar o Melhor Envio.",
    }, { status: 400 });
  }
  const credential = await readMelhorEnvioCredential(context.company.id);

  await db.transaction(async (tx) => {
    await tx.update(companySettings).set({
      settings: { ...current.settings, shipping: nextShipping },
      updatedAt: new Date(),
    }).where(eq(companySettings.companyId, context.company.id));

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "shipping.update",
      entityType: "company_settings",
      entityId: context.company.id,
      metadata: {
        melhorEnvioEnabled: nextShipping.melhorEnvioEnabled,
        hasMelhorEnvioToken: credential.connected,
        originZip: nextShipping.originZip,
      },
    });
  });

  return NextResponse.json({ shipping: await getSettings(context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const destinationZip = cleanString(body?.destinationZip, 16);
  const weightG = Number(body?.weightG) || 0;
  const lengthCm = cleanNumber(body?.lengthCm, 16);
  const widthCm = cleanNumber(body?.widthCm, 11);
  const heightCm = cleanNumber(body?.heightCm, 4);
  const insuranceValue = cleanNumber(body?.insuranceValue, 1);
  const settings = await getSettings(contextResult.context.company.id);

  if (!destinationZip || weightG <= 0 || lengthCm <= 0 || widthCm <= 0 || heightCm <= 0) {
    return NextResponse.json({ error: "invalid_quote" }, { status: 400 });
  }
  if (!settings.hasMelhorEnvioToken) {
    return NextResponse.json({
      quote: {
        mode: "manual",
        available: false,
        message: "Preencha frete, etiqueta e rastreio manualmente ou conecte a conta do Melhor Envio.",
      },
    });
  }
  if (!settings.melhorEnvioEnabled) {
    return NextResponse.json({
      quote: {
        mode: "manual",
        available: false,
        message: "A conta do Melhor Envio esta conectada. Ative a integracao e salve o envio antes de cotar.",
      },
    });
  }
  if (!settings.originZip) {
    return NextResponse.json({
      quote: {
        mode: "manual",
        available: false,
        message: "Informe o CEP de origem antes de consultar o Melhor Envio.",
      },
    });
  }

  const accessToken = await getMelhorEnvioAccessToken(contextResult.context.company.id);
  if (!accessToken) {
    return NextResponse.json({
      quote: {
        mode: "manual",
        available: false,
        message: "Reconecte o Melhor Envio para usar a cotacao automatica.",
      },
    });
  }

  const result = await quoteMelhorEnvio(contextResult.context.company.id, {
    originZip: settings.originZip,
    destinationZip,
    weightG,
    lengthCm,
    widthCm,
    heightCm,
    insuranceValue,
  });

  await db.insert(auditLogs).values({
    companyId: contextResult.context.company.id,
    actorUserId: contextResult.context.user.id,
    action: "shipping.quote",
    entityType: "shipping",
    entityId: contextResult.context.company.id,
    metadata: {
      provider: "melhor_envio",
      destinationZip,
      weightG,
      status: result.status,
      services: result.services.length,
      error: result.errorMessage ?? null,
    },
  });

  if (result.services.length > 0) {
    return NextResponse.json({
      quote: {
        mode: "melhor_envio",
        available: true,
        message: quoteSummary(result.services),
        services: result.services,
        refreshed: result.refreshed,
      },
    });
  }

  return NextResponse.json({
    quote: {
      mode: "melhor_envio",
      available: false,
      message: result.errorMessage
        ? `Melhor Envio: ${result.errorMessage}`
        : result.status === 401
        ? "Reconecte o Melhor Envio para renovar a autorizacao."
        : "Melhor Envio nao retornou cotacoes para este pacote. Use o preenchimento manual.",
      status: result.status,
    },
  });
}

export async function DELETE(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  await disconnectMelhorEnvio(context.company.id);
  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.disconnect",
    entityType: "integration_credentials",
    entityId: context.company.id,
    metadata: { provider: "melhor_envio" },
  });

  return NextResponse.json({ shipping: await getSettings(context.company.id) });
}
