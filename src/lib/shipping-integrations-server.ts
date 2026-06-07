import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { integrationCredentials, orders } from "@/db/schema";
import { decryptSecret, encryptSecret, encryptionConfigured } from "@/lib/integration-secrets-server";

export const MELHOR_ENVIO_PROVIDER = "melhor_envio";
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

export type MelhorEnvioCredentialStatus = {
  connected: boolean;
  status: string;
  environment: string;
  expiresAt: string | null;
  scope: string | null;
};

export type MelhorEnvioQuoteInput = {
  originZip: string;
  destinationZip: string;
  weightG: number;
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  insuranceValue?: number;
};

export type MelhorEnvioQuoteService = {
  id: string;
  name: string;
  company: string | null;
  price: number;
  deliveryTime: number | null;
  currency: "BRL";
};

export type MelhorEnvioShipmentAddress = {
  documentType?: "cpf" | "cnpj";
  name: string;
  phone?: string | null;
  email?: string | null;
  document?: string | null;
  companyDocument?: string | null;
  stateRegister?: string | null;
  address: string;
  complement?: string | null;
  number: string;
  district: string;
  city: string;
  stateAbbr: string;
  postalCode: string;
  note?: string | null;
};

export type MelhorEnvioCartShipmentInput = {
  serviceId: string;
  sender: MelhorEnvioShipmentAddress;
  recipient: MelhorEnvioShipmentAddress;
  products: Array<{
    id: string;
    name: string;
    quantity: number;
    unitaryValue: number;
  }>;
  volume: {
    weightG: number;
    lengthCm: number;
    widthCm: number;
    heightCm: number;
  };
  options: {
    insuranceValue: number;
    receipt: boolean;
    ownHand: boolean;
    nonCommercial: boolean;
    invoiceKey?: string | null;
  };
};

export type MelhorEnvioCartShipment = {
  id: string;
  protocol: string | null;
  status: string | null;
  price: number | null;
  tracking: string | null;
  trackingUrl: string | null;
};

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

type MelhorEnvioQuoteResult = {
  services: MelhorEnvioQuoteService[];
  status: number;
  refreshed: boolean;
  errorMessage?: string;
  errorPayload?: unknown;
};

type MelhorEnvioCartShipmentResult = {
  shipment: MelhorEnvioCartShipment | null;
  status: number;
  refreshed: boolean;
  errorMessage?: string;
  errorPayload?: unknown;
};

export type MelhorEnvioShipmentAction = "checkout" | "generate" | "preview" | "print";

type MelhorEnvioShipmentActionResult = {
  ok: boolean;
  status: number;
  refreshed: boolean;
  url?: string | null;
  tracking?: string | null;
  trackingUrl?: string | null;
  payload?: unknown;
  errorMessage?: string;
  errorPayload?: unknown;
};

export function melhorEnvioEnvironment() {
  return process.env.MELHOR_ENVIO_ENV === "sandbox" ? "sandbox" : "production";
}

export function melhorEnvioOAuthConfigured() {
  return Boolean(
    process.env.MELHOR_ENVIO_CLIENT_ID &&
    process.env.MELHOR_ENVIO_CLIENT_SECRET &&
    process.env.MELHOR_ENVIO_REDIRECT_URI,
  );
}

function melhorEnvioWebBase() {
  return process.env.MELHOR_ENVIO_WEB_URL
    || (melhorEnvioEnvironment() === "sandbox" ? "https://sandbox.melhorenvio.com.br" : "https://melhorenvio.com.br");
}

function melhorEnvioApiBase() {
  return process.env.MELHOR_ENVIO_API_URL || `${melhorEnvioWebBase()}/api/v2`;
}

function melhorEnvioUserAgent() {
  return process.env.MELHOR_ENVIO_USER_AGENT || "Atelie OS (suporte@atelie-os.local)";
}

export function melhorEnvioAuthorizeUrl(state: string) {
  const url = new URL(process.env.MELHOR_ENVIO_AUTH_URL || `${melhorEnvioWebBase()}/oauth/authorize`);
  url.searchParams.set("client_id", process.env.MELHOR_ENVIO_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", process.env.MELHOR_ENVIO_REDIRECT_URI || "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.MELHOR_ENVIO_SCOPES || "shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking cart-read cart-write");
  url.searchParams.set("state", state);
  return url.toString();
}

export function melhorEnvioTokenUrl() {
  return process.env.MELHOR_ENVIO_TOKEN_URL || `${melhorEnvioWebBase()}/oauth/token`;
}

export function cleanPostalCode(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

function cleanDigits(value: string | null | undefined, max = 32) {
  return (value ?? "").replace(/\D/g, "").slice(0, max);
}

function expiresAtFromSeconds(seconds: number | undefined) {
  return seconds ? new Date(Date.now() + seconds * 1000) : null;
}

function shouldRefresh(expiresAt: Date | null | undefined) {
  return Boolean(expiresAt && expiresAt.getTime() - Date.now() <= TOKEN_REFRESH_WINDOW_MS);
}

function quoteMoney(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.replace(",", ".");
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function quoteText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function quoteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function extractMelhorEnvioError(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    const errored = payload.find((item) => item && typeof item === "object" && "error" in item);
    return errored ? extractMelhorEnvioError(errored) : null;
  }

  const row = payload as Record<string, unknown>;
  const error = row.error;
  if (typeof error === "string") return error;
  if (error && typeof error === "object") {
    const message = (error as Record<string, unknown>).message;
    if (typeof message === "string") return message;
  }
  if (typeof row.message === "string") return row.message;
  const errors = row.errors;
  if (errors && typeof errors === "object") {
    const first = Object.values(errors as Record<string, unknown>)[0];
    if (Array.isArray(first) && typeof first[0] === "string") return first[0];
    if (typeof first === "string") return first;
  }
  return null;
}

export function normalizeMelhorEnvioQuote(payload: unknown): MelhorEnvioQuoteService[] {
  if (!Array.isArray(payload)) return [];

  return payload.flatMap((service) => {
    if (!service || typeof service !== "object") return [];
    const row = service as Record<string, unknown>;
    if (row.error) return [];

    const price = quoteMoney(row.custom_price ?? row.price);
    if (price === null) return [];

    const company = row.company && typeof row.company === "object"
      ? quoteText((row.company as Record<string, unknown>).name)
      : "";

    return [{
      id: String(row.id ?? ""),
      name: quoteText(row.name) || `Servico ${String(row.id ?? "")}`,
      company: company || null,
      price,
      deliveryTime: quoteNumber(row.custom_delivery_time ?? row.delivery_time),
      currency: "BRL" as const,
    }];
  }).sort((left, right) => left.price - right.price);
}

export async function readMelhorEnvioCredential(companyId: string): Promise<MelhorEnvioCredentialStatus> {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
    ),
  });

  return {
    connected: Boolean(row?.accessTokenEncrypted && row.status === "connected"),
    status: row?.status ?? "disconnected",
    environment: row?.environment ?? melhorEnvioEnvironment(),
    expiresAt: row?.expiresAt?.toISOString() ?? null,
    scope: row?.scope ?? null,
  };
}

async function refreshMelhorEnvioAccessToken(companyId: string) {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
    ),
  });
  if (!row?.refreshTokenEncrypted || row.status !== "connected" || !melhorEnvioOAuthConfigured()) return null;

  const tokenRes = await fetch(melhorEnvioTokenUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.MELHOR_ENVIO_CLIENT_ID,
      client_secret: process.env.MELHOR_ENVIO_CLIENT_SECRET,
      refresh_token: decryptSecret(row.refreshTokenEncrypted),
    }),
  });

  if (!tokenRes.ok) {
    await db.update(integrationCredentials).set({
      status: "reconnect_required",
      updatedAt: new Date(),
    }).where(and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
    ));
    return null;
  }

  const token = await tokenRes.json() as TokenResponse;
  if (!token.access_token) return null;

  await db.update(integrationCredentials).set({
    accessTokenEncrypted: encryptSecret(token.access_token),
    refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : row.refreshTokenEncrypted,
    tokenType: token.token_type ?? row.tokenType ?? "Bearer",
    scope: token.scope ?? row.scope,
    expiresAt: expiresAtFromSeconds(token.expires_in),
    status: "connected",
    updatedAt: new Date(),
  }).where(and(
    eq(integrationCredentials.companyId, companyId),
    eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
  ));

  return token.access_token;
}

export async function getMelhorEnvioAccessToken(companyId: string, options: { forceRefresh?: boolean } = {}) {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
    ),
  });
  if (!row?.accessTokenEncrypted || row.status !== "connected") return null;
  if (options.forceRefresh || shouldRefresh(row.expiresAt)) {
    const refreshed = await refreshMelhorEnvioAccessToken(companyId);
    if (refreshed) return refreshed;
  }
  return decryptSecret(row.accessTokenEncrypted);
}

async function callMelhorEnvioQuote(accessToken: string, input: MelhorEnvioQuoteInput) {
  const res = await fetch(`${melhorEnvioApiBase()}/me/shipment/calculate`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      "user-agent": melhorEnvioUserAgent(),
    },
    body: JSON.stringify({
      from: { postal_code: cleanPostalCode(input.originZip) },
      to: { postal_code: cleanPostalCode(input.destinationZip) },
      products: [{
        id: "atelie-os-package",
        width: input.widthCm,
        height: input.heightCm,
        length: input.lengthCm,
        weight: Math.max(0.01, Math.round((input.weightG / 1000) * 1000) / 1000),
        insurance_value: input.insuranceValue ?? 1,
        quantity: 1,
      }],
      volumes: [{
        width: input.widthCm,
        height: input.heightCm,
        length: input.lengthCm,
        weight: Math.max(0.01, Math.round((input.weightG / 1000) * 1000) / 1000),
        insurance_value: input.insuranceValue ?? 1,
      }],
      options: {
        receipt: false,
        own_hand: false,
      },
    }),
  });

  return res;
}

function melhorEnvioAddress(address: MelhorEnvioShipmentAddress) {
  const document = cleanDigits(address.document, 11);
  const companyDocument = cleanDigits(address.companyDocument, 14);
  return {
    name: address.name,
    phone: cleanDigits(address.phone),
    email: address.email ?? "",
    ...(document ? { document } : {}),
    ...(companyDocument ? { company_document: companyDocument } : {}),
    state_register: address.stateRegister ?? "",
    address: address.address,
    complement: address.complement ?? "",
    number: address.number,
    district: address.district,
    city: address.city,
    state_abbr: address.stateAbbr,
    country_id: "BR",
    postal_code: cleanPostalCode(address.postalCode),
    note: address.note ?? "",
  };
}

function callMelhorEnvioCartShipment(accessToken: string, input: MelhorEnvioCartShipmentInput) {
  const weightKg = Math.max(0.01, Math.round((input.volume.weightG / 1000) * 1000) / 1000);

  return fetch(`${melhorEnvioApiBase()}/me/cart`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      "user-agent": melhorEnvioUserAgent(),
    },
    body: JSON.stringify({
      service: Number(input.serviceId),
      from: melhorEnvioAddress(input.sender),
      to: melhorEnvioAddress(input.recipient),
      products: input.products.map((product) => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        unitary_value: product.unitaryValue,
      })),
      volumes: [{
        width: input.volume.widthCm,
        height: input.volume.heightCm,
        length: input.volume.lengthCm,
        weight: weightKg,
      }],
      options: {
        insurance_value: input.options.insuranceValue,
        receipt: input.options.receipt,
        own_hand: input.options.ownHand,
        reverse: false,
        non_commercial: input.options.nonCommercial,
        invoice: {
          key: input.options.invoiceKey ?? "",
        },
      },
    }),
  });
}

function shipmentActionPath(action: MelhorEnvioShipmentAction) {
  if (action === "checkout") return "checkout";
  if (action === "generate") return "generate";
  if (action === "preview") return "preview";
  return "print";
}

function callMelhorEnvioShipmentAction(accessToken: string, action: MelhorEnvioShipmentAction, orderIds: string[]) {
  return fetch(`${melhorEnvioApiBase()}/me/shipment/${shipmentActionPath(action)}`, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
      "user-agent": melhorEnvioUserAgent(),
    },
    body: JSON.stringify({
      orders: orderIds,
      ...(action === "print" ? { mode: "public" } : {}),
    }),
  });
}

function extractUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const url = extractUrl(item);
      if (url) return url;
    }
    return null;
  }
  const row = payload as Record<string, unknown>;
  for (const key of ["url", "print_url", "preview_url", "link", "href"]) {
    const value = row[key];
    if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  }
  for (const value of Object.values(row)) {
    const url = extractUrl(value);
    if (url) return url;
  }
  return null;
}

export function extractTracking(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const tracking = extractTracking(item);
      if (tracking) return tracking;
    }
    return null;
  }
  const row = payload as Record<string, unknown>;
  for (const key of ["tracking", "self_tracking"]) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  for (const value of Object.values(row)) {
    const tracking = extractTracking(value);
    if (tracking) return tracking;
  }
  return null;
}

export function extractTrackingUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  if (Array.isArray(payload)) {
    for (const item of payload) {
      const url = extractTrackingUrl(item);
      if (url) return url;
    }
    return null;
  }
  const row = payload as Record<string, unknown>;
  const value = row.tracking_url;
  if (typeof value === "string" && /^https?:\/\//.test(value)) return value;
  for (const nested of Object.values(row)) {
    const url = extractTrackingUrl(nested);
    if (url) return url;
  }
  return null;
}

export function normalizeMelhorEnvioCartShipment(payload: unknown): MelhorEnvioCartShipment | null {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  const id = quoteText(row.id);
  if (!id) return null;
  return {
    id,
    protocol: quoteText(row.protocol) || null,
    status: quoteText(row.status) || null,
    price: quoteMoney(row.price ?? row.quote),
    tracking: quoteText(row.tracking ?? row.self_tracking) || null,
    trackingUrl: quoteText(row.tracking_url) || null,
  };
}

export async function quoteMelhorEnvio(companyId: string, input: MelhorEnvioQuoteInput): Promise<MelhorEnvioQuoteResult> {
  const accessToken = await getMelhorEnvioAccessToken(companyId);
  if (!accessToken) return { services: [], status: 401, refreshed: false };

  let res = await callMelhorEnvioQuote(accessToken, input);
  let refreshed = false;
  if (res.status === 401) {
    const nextToken = await getMelhorEnvioAccessToken(companyId, { forceRefresh: true });
    if (nextToken) {
      refreshed = true;
      res = await callMelhorEnvioQuote(nextToken, input);
    }
  }

  const payload = await res.json().catch(() => null) as unknown;
  if (!res.ok) {
    return {
      services: [],
      status: res.status,
      refreshed,
      errorMessage: extractMelhorEnvioError(payload) ?? `Melhor Envio respondeu HTTP ${res.status}.`,
      errorPayload: payload,
    };
  }

  const services = normalizeMelhorEnvioQuote(payload);
  return {
    services,
    status: res.status,
    refreshed,
    errorMessage: services.length ? undefined : extractMelhorEnvioError(payload) ?? "Nenhum servico retornado para este pacote.",
    errorPayload: services.length ? undefined : payload,
  };
}

export async function createMelhorEnvioCartShipment(companyId: string, input: MelhorEnvioCartShipmentInput): Promise<MelhorEnvioCartShipmentResult> {
  const accessToken = await getMelhorEnvioAccessToken(companyId);
  if (!accessToken) return { shipment: null, status: 401, refreshed: false };

  let res = await callMelhorEnvioCartShipment(accessToken, input);
  let refreshed = false;
  if (res.status === 401) {
    const nextToken = await getMelhorEnvioAccessToken(companyId, { forceRefresh: true });
    if (nextToken) {
      refreshed = true;
      res = await callMelhorEnvioCartShipment(nextToken, input);
    }
  }

  const payload = await res.json().catch(() => null) as unknown;
  if (!res.ok) {
    return {
      shipment: null,
      status: res.status,
      refreshed,
      errorMessage: extractMelhorEnvioError(payload) ?? `Melhor Envio respondeu HTTP ${res.status}.`,
      errorPayload: payload,
    };
  }

  const shipment = normalizeMelhorEnvioCartShipment(payload);
  return {
    shipment,
    status: res.status,
    refreshed,
    errorMessage: shipment ? undefined : extractMelhorEnvioError(payload) ?? "Melhor Envio nao retornou o identificador da etiqueta.",
    errorPayload: shipment ? undefined : payload,
  };
}

export async function runMelhorEnvioShipmentAction(companyId: string, action: MelhorEnvioShipmentAction, orderIds: string[]): Promise<MelhorEnvioShipmentActionResult> {
  const accessToken = await getMelhorEnvioAccessToken(companyId);
  if (!accessToken) return { ok: false, status: 401, refreshed: false };

  let res = await callMelhorEnvioShipmentAction(accessToken, action, orderIds);
  let refreshed = false;
  if (res.status === 401) {
    const nextToken = await getMelhorEnvioAccessToken(companyId, { forceRefresh: true });
    if (nextToken) {
      refreshed = true;
      res = await callMelhorEnvioShipmentAction(nextToken, action, orderIds);
    }
  }

  const payload = await res.json().catch(() => null) as unknown;
  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      refreshed,
      errorMessage: extractMelhorEnvioError(payload) ?? `Melhor Envio respondeu HTTP ${res.status}.`,
      errorPayload: payload,
    };
  }

  return {
    ok: true,
    status: res.status,
    refreshed,
    url: extractUrl(payload),
    tracking: extractTracking(payload),
    trackingUrl: extractTrackingUrl(payload),
    payload,
  };
}

export type MelhorEnvioShipmentUpdate = {
  externalId: string;
  status?: string | null;
  protocol?: string | null;
  tracking?: string | null;
  trackingUrl?: string | null;
  postedAt?: string | null;
  deliveredAt?: string | null;
};

/**
 * Locates the company-scoped order that owns a Melhor Envio shipment (matched by
 * `metadata.shippingLabel.externalId`) and merges fresh provider data into the
 * stored label. Mirrors the tracking code onto the top-level `orders.tracking`
 * column so order lists/detail surface it without re-reading metadata.
 * Returns the resolved company/order ids, or null when no order matches.
 */
export async function applyMelhorEnvioShipmentUpdate(
  update: MelhorEnvioShipmentUpdate,
): Promise<{ companyId: string; orderId: string } | null> {
  if (!update.externalId) return null;

  const rows = await db
    .select({ id: orders.id, companyId: orders.companyId, metadata: orders.metadata })
    .from(orders)
    .where(sql`${orders.metadata}->'shippingLabel'->>'externalId' = ${update.externalId}`)
    .limit(1);

  const order = rows[0];
  if (!order) return null;

  const metadata = order.metadata ?? {};
  const existingLabel = (metadata.shippingLabel && typeof metadata.shippingLabel === "object"
    ? metadata.shippingLabel
    : {}) as Record<string, unknown>;

  const nextLabel = {
    ...existingLabel,
    ...(update.status ? { status: update.status } : {}),
    ...(update.protocol ? { protocol: update.protocol } : {}),
    ...(update.tracking ? { tracking: update.tracking } : {}),
    ...(update.trackingUrl ? { trackingUrl: update.trackingUrl } : {}),
    ...(update.postedAt ? { postedAt: update.postedAt } : {}),
    ...(update.deliveredAt ? { deliveredAt: update.deliveredAt } : {}),
  };

  await db.update(orders).set({
    metadata: { ...metadata, shippingLabel: nextLabel },
    ...(update.tracking ? { tracking: update.tracking } : {}),
    updatedAt: new Date(),
  }).where(eq(orders.id, order.id));

  return { companyId: order.companyId, orderId: order.id };
}

export async function upsertMelhorEnvioCredential(input: {
  companyId: string;
  userId: string;
  accessToken: string;
  refreshToken?: string | null;
  tokenType?: string | null;
  scope?: string | null;
  expiresAt?: Date | null;
  metadata?: Record<string, unknown>;
}) {
  const now = new Date();
  await db.insert(integrationCredentials).values({
    companyId: input.companyId,
    provider: MELHOR_ENVIO_PROVIDER,
    environment: melhorEnvioEnvironment(),
    status: "connected",
    accessTokenEncrypted: encryptSecret(input.accessToken),
    refreshTokenEncrypted: input.refreshToken ? encryptSecret(input.refreshToken) : null,
    tokenType: input.tokenType ?? "Bearer",
    scope: input.scope ?? null,
    expiresAt: input.expiresAt ?? null,
    connectedByUserId: input.userId,
    metadata: {
      encryptionConfigured: encryptionConfigured(),
      ...(input.metadata ?? {}),
    },
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [integrationCredentials.companyId, integrationCredentials.provider],
    set: {
      environment: melhorEnvioEnvironment(),
      status: "connected",
      accessTokenEncrypted: encryptSecret(input.accessToken),
      refreshTokenEncrypted: input.refreshToken ? encryptSecret(input.refreshToken) : null,
      tokenType: input.tokenType ?? "Bearer",
      scope: input.scope ?? null,
      expiresAt: input.expiresAt ?? null,
      connectedByUserId: input.userId,
      metadata: {
        encryptionConfigured: encryptionConfigured(),
        ...(input.metadata ?? {}),
      },
      updatedAt: now,
    },
  });
}

export async function disconnectMelhorEnvio(companyId: string) {
  await db.update(integrationCredentials).set({
    status: "disconnected",
    accessTokenEncrypted: null,
    refreshTokenEncrypted: null,
    expiresAt: null,
    updatedAt: new Date(),
  }).where(and(
    eq(integrationCredentials.companyId, companyId),
    eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
  ));
}
