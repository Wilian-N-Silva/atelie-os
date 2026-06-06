import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { verifyOAuthState } from "@/lib/oauth-state-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";
import {
  MELHOR_ENVIO_PROVIDER,
  melhorEnvioOAuthConfigured,
  melhorEnvioTokenUrl,
  upsertMelhorEnvioCredential,
} from "@/lib/shipping-integrations-server";

export const runtime = "nodejs";

type TokenResponse = {
  access_token?: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
  scope?: string;
};

type ShippingSettings = {
  melhorEnvioEnabled?: boolean;
  originZip?: string;
  originCity?: string;
  defaultService?: string;
};

function appRedirect(request: Request, status: "connected" | "error") {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.BETTER_AUTH_URL || request.url;
  const url = new URL("/", appUrl);
  url.searchParams.set("shipping", status);
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
  const state = verifyOAuthState(url.searchParams.get("state"), {
    companyId: context.company.id,
    userId: context.user.id,
    provider: MELHOR_ENVIO_PROVIDER,
  });

  if (!code || !state || !melhorEnvioOAuthConfigured()) {
    return appRedirect(request, "error");
  }

  const tokenRes = await fetch(melhorEnvioTokenUrl(), {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: process.env.MELHOR_ENVIO_CLIENT_ID,
      client_secret: process.env.MELHOR_ENVIO_CLIENT_SECRET,
      redirect_uri: process.env.MELHOR_ENVIO_REDIRECT_URI,
      code,
    }),
  });

  if (!tokenRes.ok) {
    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "shipping.connect",
      entityType: "integration_credentials",
      entityId: context.company.id,
      metadata: { provider: MELHOR_ENVIO_PROVIDER, step: "callback", ok: false, status: tokenRes.status },
    });
    return appRedirect(request, "error");
  }

  const token = await tokenRes.json() as TokenResponse;
  if (!token.access_token) return appRedirect(request, "error");

  const expiresAt = token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null;
  await upsertMelhorEnvioCredential({
    companyId: context.company.id,
    userId: context.user.id,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    tokenType: token.token_type,
    scope: token.scope,
    expiresAt,
    metadata: { connectedVia: "oauth" },
  });

  const settingsRow = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, context.company.id),
  });
  if (settingsRow) {
    const currentShipping = settingsRow.settings.shipping && typeof settingsRow.settings.shipping === "object"
      ? settingsRow.settings.shipping as ShippingSettings
      : {};
    await db.update(companySettings).set({
      settings: {
        ...settingsRow.settings,
        shipping: {
          ...currentShipping,
          melhorEnvioEnabled: true,
          defaultService: currentShipping.defaultService || "melhor_envio",
        },
      },
      updatedAt: new Date(),
    }).where(eq(companySettings.companyId, context.company.id));
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.connect",
    entityType: "integration_credentials",
    entityId: context.company.id,
    metadata: { provider: MELHOR_ENVIO_PROVIDER, step: "callback", ok: true, expiresAt: expiresAt?.toISOString() ?? null },
  });

  return appRedirect(request, "connected");
}
