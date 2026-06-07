import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  exchangeMercadoLivreCode,
  MERCADO_LIVRE_PROVIDER,
  mercadoLivreOAuthConfigured,
  upsertMercadoLivreCredential,
} from "@/lib/mercado-livre-server";
import { verifyOAuthState } from "@/lib/oauth-state-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
  user_id?: number;
};

function tokenErrorMetadata(payload: unknown) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return {};
  const row = payload as Record<string, unknown>;
  return {
    error: typeof row.error === "string" ? row.error : null,
    message: typeof row.message === "string" ? row.message.slice(0, 160) : null,
    cause: typeof row.cause === "string" ? row.cause.slice(0, 160) : null,
  };
}

function appRedirect(request: Request, status: "connected" | "error") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || request.url;
  const url = new URL("/", appUrl);
  url.searchParams.set("mercado_livre", status);
  return NextResponse.redirect(url);
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const rawState = url.searchParams.get("state");
  const statePayload = rawState?.split(".")[0];
  let providerWithVerifier = "";
  if (statePayload) {
    try {
      const decoded = JSON.parse(Buffer.from(statePayload, "base64url").toString("utf8")) as { provider?: string };
      providerWithVerifier = decoded.provider ?? "";
    } catch {
      providerWithVerifier = "";
    }
  }
  const [provider, codeVerifier] = providerWithVerifier.split(":");
  const state = verifyOAuthState(rawState, {
    companyId: context.company.id,
    userId: context.user.id,
    provider: providerWithVerifier,
  });

  if (provider !== MERCADO_LIVRE_PROVIDER || !codeVerifier || !code || !state || !mercadoLivreOAuthConfigured()) {
    return appRedirect(request, "error");
  }

  const tokenResult = await exchangeMercadoLivreCode(code, codeVerifier);
  if (!tokenResult.ok) {
    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "shipping.connect",
      entityType: "integration_credentials",
      entityId: context.company.id,
      metadata: {
        provider: MERCADO_LIVRE_PROVIDER,
        step: "callback",
        ok: false,
        status: tokenResult.status,
        ...tokenErrorMetadata(tokenResult.payload),
      },
    });
    return appRedirect(request, "error");
  }

  const token = tokenResult.payload as TokenResponse;
  if (!token.access_token) return appRedirect(request, "error");

  await upsertMercadoLivreCredential({
    companyId: context.company.id,
    userId: context.user.id,
    token,
  });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.connect",
    entityType: "integration_credentials",
    entityId: context.company.id,
    metadata: {
      provider: MERCADO_LIVRE_PROVIDER,
      step: "callback",
      ok: true,
      expiresIn: token.expires_in ?? null,
      externalUserId: token.user_id ?? null,
    },
  });

  return appRedirect(request, "connected");
}
