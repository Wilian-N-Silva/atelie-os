import { createHash, randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrationCredentials } from "@/db/schema";
import { decryptSecret, encryptSecret, encryptionConfigured } from "@/lib/integration-secrets-server";

export const MERCADO_LIVRE_PROVIDER = "mercado_livre";
const TOKEN_REFRESH_WINDOW_MS = 5 * 60 * 1000;

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
};

export type MercadoLivreCredentialStatus = {
  connected: boolean;
  status: string;
  expiresAt: string | null;
  scope: string | null;
  externalUserId: number | null;
};

export type MercadoLivreUserResult = {
  ok: boolean;
  status: number;
  refreshed: boolean;
  user: {
    id: number | null;
    nickname: string | null;
    email: string | null;
    siteId: string | null;
  } | null;
};

export type MercadoLivreImportLine = {
  sku: string;
  qty: number;
  price: number;
  title: string | null;
};

export type MercadoLivreImportOrder = {
  externalOrderId: string;
  buyerName: string;
  buyerEmail: string | null;
  total: number;
  lines: MercadoLivreImportLine[];
  rawPayload: Record<string, unknown>;
};

export type MercadoLivreOrdersResult = {
  ok: boolean;
  status: number;
  refreshed: boolean;
  orders: MercadoLivreImportOrder[];
};

function mercadoLivreAuthUrl() {
  return process.env.MERCADO_LIVRE_AUTH_URL || "https://auth.mercadolivre.com.br/authorization";
}

function mercadoLivreApiBase() {
  return process.env.MERCADO_LIVRE_API_URL || "https://api.mercadolibre.com";
}

export function mercadoLivreTokenUrl() {
  return process.env.MERCADO_LIVRE_TOKEN_URL || "https://api.mercadolibre.com/oauth/token";
}

export function mercadoLivreOAuthConfigured() {
  return Boolean(
    process.env.MERCADO_LIVRE_CLIENT_ID &&
    process.env.MERCADO_LIVRE_CLIENT_SECRET &&
    process.env.MERCADO_LIVRE_REDIRECT_URI,
  );
}

export function createMercadoLivreCodeVerifier() {
  return randomBytes(48).toString("base64url");
}

export function mercadoLivreCodeChallenge(verifier: string) {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function mercadoLivreAuthorizeUrl(state: string, codeChallenge: string) {
  const url = new URL(mercadoLivreAuthUrl());
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", process.env.MERCADO_LIVRE_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", process.env.MERCADO_LIVRE_REDIRECT_URI || "");
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", codeChallenge);
  url.searchParams.set("code_challenge_method", "S256");
  return url.toString();
}

function expiresAtFromSeconds(seconds: number | undefined) {
  return seconds ? new Date(Date.now() + seconds * 1000) : null;
}

function shouldRefresh(expiresAt: Date | null | undefined) {
  return Boolean(expiresAt && expiresAt.getTime() - Date.now() <= TOKEN_REFRESH_WINDOW_MS);
}

function metadataExternalUserId(metadata: Record<string, unknown>) {
  const value = metadata.externalUserId;
  return typeof value === "number" ? value : null;
}

export async function exchangeMercadoLivreCode(code: string, codeVerifier: string) {
  const res = await fetch(mercadoLivreTokenUrl(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: process.env.MERCADO_LIVRE_CLIENT_SECRET,
      redirect_uri: process.env.MERCADO_LIVRE_REDIRECT_URI,
      code,
      code_verifier: codeVerifier,
    }),
  });

  const payload = await res.json().catch(() => null) as TokenResponse | Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, payload };
}

export async function upsertMercadoLivreCredential(input: {
  companyId: string;
  userId: string;
  token: TokenResponse;
}) {
  if (!input.token.access_token) throw new Error("Mercado Livre access token is required.");

  const now = new Date();
  const expiresAt = expiresAtFromSeconds(input.token.expires_in);
  const metadata = {
    encryptionConfigured: encryptionConfigured(),
    connectedVia: "oauth",
    externalUserId: input.token.user_id ?? null,
  };

  await db.insert(integrationCredentials).values({
    companyId: input.companyId,
    provider: MERCADO_LIVRE_PROVIDER,
    environment: "production",
    status: "connected",
    accessTokenEncrypted: encryptSecret(input.token.access_token),
    refreshTokenEncrypted: input.token.refresh_token ? encryptSecret(input.token.refresh_token) : null,
    tokenType: input.token.token_type ?? "Bearer",
    scope: input.token.scope ?? null,
    expiresAt,
    connectedByUserId: input.userId,
    metadata,
    updatedAt: now,
  }).onConflictDoUpdate({
    target: [integrationCredentials.companyId, integrationCredentials.provider],
    set: {
      environment: "production",
      status: "connected",
      accessTokenEncrypted: encryptSecret(input.token.access_token),
      refreshTokenEncrypted: input.token.refresh_token ? encryptSecret(input.token.refresh_token) : null,
      tokenType: input.token.token_type ?? "Bearer",
      scope: input.token.scope ?? null,
      expiresAt,
      connectedByUserId: input.userId,
      metadata,
      updatedAt: now,
    },
  });
}

export async function readMercadoLivreCredential(companyId: string): Promise<MercadoLivreCredentialStatus> {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MERCADO_LIVRE_PROVIDER),
    ),
  });

  return {
    connected: Boolean(row?.accessTokenEncrypted && row.status === "connected"),
    status: row?.status ?? "disconnected",
    expiresAt: row?.expiresAt?.toISOString() ?? null,
    scope: row?.scope ?? null,
    externalUserId: metadataExternalUserId(row?.metadata ?? {}),
  };
}

async function refreshMercadoLivreAccessToken(companyId: string) {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MERCADO_LIVRE_PROVIDER),
    ),
  });
  if (!row?.refreshTokenEncrypted || row.status !== "connected" || !mercadoLivreOAuthConfigured()) return null;

  const res = await fetch(mercadoLivreTokenUrl(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: process.env.MERCADO_LIVRE_CLIENT_ID,
      client_secret: process.env.MERCADO_LIVRE_CLIENT_SECRET,
      refresh_token: decryptSecret(row.refreshTokenEncrypted),
    }),
  });

  if (!res.ok) {
    await db.update(integrationCredentials).set({
      status: "reconnect_required",
      updatedAt: new Date(),
    }).where(and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MERCADO_LIVRE_PROVIDER),
    ));
    return null;
  }

  const token = await res.json().catch(() => null) as TokenResponse | null;
  if (!token?.access_token) return null;

  const metadata = {
    ...(row.metadata ?? {}),
    encryptionConfigured: encryptionConfigured(),
    ...(token.user_id ? { externalUserId: token.user_id } : {}),
  };

  await db.update(integrationCredentials).set({
    status: "connected",
    accessTokenEncrypted: encryptSecret(token.access_token),
    refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : row.refreshTokenEncrypted,
    tokenType: token.token_type ?? row.tokenType ?? "Bearer",
    scope: token.scope ?? row.scope,
    expiresAt: expiresAtFromSeconds(token.expires_in),
    metadata,
    updatedAt: new Date(),
  }).where(and(
    eq(integrationCredentials.companyId, companyId),
    eq(integrationCredentials.provider, MERCADO_LIVRE_PROVIDER),
  ));

  return token.access_token;
}

export async function getMercadoLivreAccessToken(companyId: string, options: { forceRefresh?: boolean } = {}) {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MERCADO_LIVRE_PROVIDER),
    ),
  });

  if (!row?.accessTokenEncrypted || row.status !== "connected") return null;
  if (options.forceRefresh || shouldRefresh(row.expiresAt)) {
    const refreshed = await refreshMercadoLivreAccessToken(companyId);
    if (refreshed) return refreshed;
    if (options.forceRefresh || (row.expiresAt ? row.expiresAt.getTime() < Date.now() : false)) return null;
  }
  return decryptSecret(row.accessTokenEncrypted);
}

function normalizeMercadoLivreUser(payload: unknown): MercadoLivreUserResult["user"] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  return {
    id: typeof row.id === "number" ? row.id : null,
    nickname: typeof row.nickname === "string" ? row.nickname : null,
    email: typeof row.email === "string" ? row.email : null,
    siteId: typeof row.site_id === "string" ? row.site_id : null,
  };
}

async function callMercadoLivreUser(accessToken: string) {
  return fetch(`${mercadoLivreApiBase()}/users/me`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getMercadoLivreUser(companyId: string): Promise<MercadoLivreUserResult> {
  const accessToken = await getMercadoLivreAccessToken(companyId);
  if (!accessToken) return { ok: false, status: 401, refreshed: false, user: null };

  let res = await callMercadoLivreUser(accessToken);
  let refreshed = false;
  if (res.status === 401) {
    const refreshedToken = await getMercadoLivreAccessToken(companyId, { forceRefresh: true });
    if (refreshedToken) {
      refreshed = true;
      res = await callMercadoLivreUser(refreshedToken);
    }
  }

  const payload = await res.json().catch(() => null) as unknown;
  return {
    ok: res.ok,
    status: res.status,
    refreshed,
    user: res.ok ? normalizeMercadoLivreUser(payload) : null,
  };
}

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function text(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function finiteNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  return Number.isFinite(parsed) ? parsed : null;
}

function buyerName(order: Record<string, unknown>) {
  const buyer = asRecord(order.buyer);
  const firstName = text(buyer?.first_name, 80);
  const lastName = text(buyer?.last_name, 80);
  const full = [firstName, lastName].filter(Boolean).join(" ").trim();
  return full || text(buyer?.nickname, 120) || "Cliente Mercado Livre";
}

function orderLines(order: Record<string, unknown>): MercadoLivreImportLine[] {
  const items = Array.isArray(order.order_items) ? order.order_items : [];
  return items.flatMap((entry) => {
    const row = asRecord(entry);
    const item = asRecord(row?.item);
    if (!row || !item) return [];
    const sku = text(item.seller_sku, 64) || text(item.seller_custom_field, 64) || text(item.id, 64);
    const qty = finiteNumber(row.quantity) ?? 0;
    if (!sku || qty <= 0) return [];
    return [{
      sku,
      qty,
      price: finiteNumber(row.unit_price) ?? 0,
      title: text(item.title, 160) || null,
    }];
  });
}

function normalizeMercadoLivreOrder(order: unknown): MercadoLivreImportOrder | null {
  const row = asRecord(order);
  if (!row) return null;
  const externalOrderId = text(row.id, 64);
  if (!externalOrderId) return null;
  const lines = orderLines(row);
  if (!lines.length) return null;
  return {
    externalOrderId,
    buyerName: buyerName(row),
    buyerEmail: text(asRecord(row.buyer)?.email, 160) || null,
    total: finiteNumber(row.total_amount) ?? lines.reduce((sum, line) => sum + line.qty * line.price, 0),
    lines,
    rawPayload: row,
  };
}

async function callMercadoLivreOrders(accessToken: string, sellerId: number, limit: number) {
  const url = new URL(`${mercadoLivreApiBase()}/orders/search`);
  url.searchParams.set("seller", String(sellerId));
  url.searchParams.set("sort", "date_desc");
  url.searchParams.set("limit", String(Math.min(Math.max(limit, 1), 50)));
  return fetch(url, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function getMercadoLivreRecentOrders(companyId: string, limit = 20): Promise<MercadoLivreOrdersResult> {
  const credential = await readMercadoLivreCredential(companyId);
  if (!credential.externalUserId) return { ok: false, status: 409, refreshed: false, orders: [] };

  const accessToken = await getMercadoLivreAccessToken(companyId);
  if (!accessToken) return { ok: false, status: 401, refreshed: false, orders: [] };

  let res = await callMercadoLivreOrders(accessToken, credential.externalUserId, limit);
  let refreshed = false;
  if (res.status === 401) {
    const refreshedToken = await getMercadoLivreAccessToken(companyId, { forceRefresh: true });
    if (refreshedToken) {
      refreshed = true;
      res = await callMercadoLivreOrders(refreshedToken, credential.externalUserId, limit);
    }
  }

  const payload = await res.json().catch(() => null) as unknown;
  const body = asRecord(payload);
  const results = Array.isArray(body?.results) ? body.results : [];
  return {
    ok: res.ok,
    status: res.status,
    refreshed,
    orders: res.ok ? results.flatMap((order) => normalizeMercadoLivreOrder(order) ?? []) : [],
  };
}
