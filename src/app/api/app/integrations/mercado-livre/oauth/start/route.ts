import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  createMercadoLivreCodeVerifier,
  MERCADO_LIVRE_PROVIDER,
  mercadoLivreAuthorizeUrl,
  mercadoLivreCodeChallenge,
  mercadoLivreOAuthConfigured,
} from "@/lib/mercado-livre-server";
import { createOAuthState } from "@/lib/oauth-state-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  if (!mercadoLivreOAuthConfigured()) {
    return NextResponse.json({ error: "mercado_livre_oauth_not_configured" }, { status: 409 });
  }

  const codeVerifier = createMercadoLivreCodeVerifier();
  const state = createOAuthState({
    companyId: context.company.id,
    userId: context.user.id,
    provider: `${MERCADO_LIVRE_PROVIDER}:${codeVerifier}`,
  });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.connect",
    entityType: "integration_credentials",
    entityId: context.company.id,
    metadata: { provider: MERCADO_LIVRE_PROVIDER, step: "start" },
  });

  return NextResponse.redirect(mercadoLivreAuthorizeUrl(state, mercadoLivreCodeChallenge(codeVerifier)));
}
