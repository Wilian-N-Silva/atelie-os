import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrationCredentials } from "@/db/schema";
import { decryptSecret, encryptSecret, encryptionConfigured } from "@/lib/integration-secrets-server";

export const NUVEMSHOP_PROVIDER = "nuvemshop";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  scope?: string;
  user_id?: number;
};

export type NuvemshopCredentialStatus = {
  connected: boolean;
  status: string;
  scope: string | null;
  storeId: number | null;
};

export type NuvemshopStoreResult = {
  ok: boolean;
  status: number;
  store: {
    id: number | null;
    name: string | null;
    email: string | null;
    country: string | null;
    mainCurrency: string | null;
    originalDomain: string | null;
  } | null;
};

function nuvemshopWebBase() {
  return process.env.NUVEMSHOP_WEB_URL || "https://www.nuvemshop.com";
}

function nuvemshopApiBase() {
  return process.env.NUVEMSHOP_API_URL || "https://api.nuvemshop.com.br";
}

export function nuvemshopTokenUrl() {
  return process.env.NUVEMSHOP_TOKEN_URL || `${nuvemshopWebBase()}/apps/authorize/token`;
}

function nuvemshopUserAgent() {
  return process.env.NUVEMSHOP_USER_AGENT || "Atelie OS (suporte@atelie-os.local)";
}

export function nuvemshopOAuthConfigured() {
  return Boolean(
    process.env.NUVEMSHOP_APP_ID &&
    process.env.NUVEMSHOP_CLIENT_ID &&
    process.env.NUVEMSHOP_CLIENT_SECRET &&
    process.env.NUVEMSHOP_REDIRECT_URI,
  );
}

export function nuvemshopAuthorizeUrl(state: string) {
  const base = process.env.NUVEMSHOP_AUTH_URL || `${nuvemshopWebBase()}/apps/${process.env.NUVEMSHOP_APP_ID || ""}/authorize`;
  const url = new URL(base);
  url.searchParams.set("state", state);
  if (process.env.NUVEMSHOP_REDIRECT_URI) {
    url.searchParams.set("redirect_uri", process.env.NUVEMSHOP_REDIRECT_URI);
  }
  return url.toString();
}

export async function exchangeNuvemshopCode(code: string) {
  const res = await fetch(nuvemshopTokenUrl(), {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      client_id: process.env.NUVEMSHOP_CLIENT_ID,
      client_secret: process.env.NUVEMSHOP_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
    }),
  });

  const payload = await res.json().catch(() => null) as TokenResponse | Record<string, unknown> | null;
  return { ok: res.ok, status: res.status, payload };
}

function metadataStoreId(metadata: Record<string, unknown>) {
  const value = metadata.storeId;
  return typeof value === "number" ? value : null;
}

export async function upsertNuvemshopCredential(input: {
  companyId: string;
  userId: string;
  token: TokenResponse;
}) {
  if (!input.token.access_token) throw new Error("Nuvemshop access token is required.");

  const now = new Date();
  const metadata = {
    encryptionConfigured: encryptionConfigured(),
    connectedVia: "oauth",
    storeId: input.token.user_id ?? null,
  };

  await db.insert(integrationCredentials).values({
    companyId: input.companyId,
    provider: NUVEMSHOP_PROVIDER,
    environment: "production",
    status: "connected",
    accessTokenEncrypted: encryptSecret(input.token.access_token),
    refreshTokenEncrypted: input.token.refresh_token ? encryptSecret(input.token.refresh_token) : null,
    tokenType: input.token.token_type ?? "Bearer",
    scope: input.token.scope ?? null,
    expiresAt: null,
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
      expiresAt: null,
      connectedByUserId: input.userId,
      metadata,
      updatedAt: now,
    },
  });
}

export async function readNuvemshopCredential(companyId: string): Promise<NuvemshopCredentialStatus> {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, NUVEMSHOP_PROVIDER),
    ),
  });

  return {
    connected: Boolean(row?.accessTokenEncrypted && row.status === "connected"),
    status: row?.status ?? "disconnected",
    scope: row?.scope ?? null,
    storeId: metadataStoreId(row?.metadata ?? {}),
  };
}

export async function getNuvemshopAccessToken(companyId: string) {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, NUVEMSHOP_PROVIDER),
    ),
  });

  if (!row?.accessTokenEncrypted || row.status !== "connected") return null;
  return decryptSecret(row.accessTokenEncrypted);
}

function localizedText(value: unknown, preferred = "pt") {
  if (typeof value === "string") return value;
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const preferredValue = row[preferred];
  if (typeof preferredValue === "string" && preferredValue) return preferredValue;
  const first = Object.values(row).find((entry) => typeof entry === "string" && entry);
  return typeof first === "string" ? first : null;
}

function normalizeStore(payload: unknown): NuvemshopStoreResult["store"] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return null;
  const row = payload as Record<string, unknown>;
  return {
    id: typeof row.id === "number" ? row.id : null,
    name: localizedText(row.name, typeof row.main_language === "string" ? row.main_language : "pt"),
    email: typeof row.email === "string" ? row.email : null,
    country: typeof row.country === "string" ? row.country : null,
    mainCurrency: typeof row.main_currency === "string" ? row.main_currency : null,
    originalDomain: typeof row.original_domain === "string" ? row.original_domain : null,
  };
}

export async function getNuvemshopStore(companyId: string): Promise<NuvemshopStoreResult> {
  const credential = await readNuvemshopCredential(companyId);
  const accessToken = await getNuvemshopAccessToken(companyId);
  if (!accessToken || !credential.storeId) return { ok: false, status: 401, store: null };

  const res = await fetch(`${nuvemshopApiBase()}/v1/${credential.storeId}/store`, {
    headers: {
      accept: "application/json",
      authorization: `Bearer ${accessToken}`,
      "user-agent": nuvemshopUserAgent(),
    },
  });

  const payload = await res.json().catch(() => null) as unknown;
  return {
    ok: res.ok,
    status: res.status,
    store: res.ok ? normalizeStore(payload) : null,
  };
}
