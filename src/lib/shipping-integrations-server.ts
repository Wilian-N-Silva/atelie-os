import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { integrationCredentials } from "@/db/schema";
import { decryptSecret, encryptSecret, encryptionConfigured } from "@/lib/integration-secrets-server";

export const MELHOR_ENVIO_PROVIDER = "melhor_envio";

export type MelhorEnvioCredentialStatus = {
  connected: boolean;
  status: string;
  environment: string;
  expiresAt: string | null;
  scope: string | null;
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

export function melhorEnvioAuthorizeUrl(state: string) {
  const url = new URL(process.env.MELHOR_ENVIO_AUTH_URL || `${melhorEnvioWebBase()}/oauth/authorize`);
  url.searchParams.set("client_id", process.env.MELHOR_ENVIO_CLIENT_ID || "");
  url.searchParams.set("redirect_uri", process.env.MELHOR_ENVIO_REDIRECT_URI || "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", process.env.MELHOR_ENVIO_SCOPES || "shipping-calculate shipping-checkout shipping-generate shipping-preview shipping-print shipping-tracking");
  url.searchParams.set("state", state);
  return url.toString();
}

export function melhorEnvioTokenUrl() {
  return process.env.MELHOR_ENVIO_TOKEN_URL || `${melhorEnvioWebBase()}/oauth/token`;
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

export async function getMelhorEnvioAccessToken(companyId: string) {
  const row = await db.query.integrationCredentials.findFirst({
    where: and(
      eq(integrationCredentials.companyId, companyId),
      eq(integrationCredentials.provider, MELHOR_ENVIO_PROVIDER),
    ),
  });
  if (!row?.accessTokenEncrypted || row.status !== "connected") return null;
  return decryptSecret(row.accessTokenEncrypted);
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
