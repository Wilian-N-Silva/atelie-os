import { NextResponse } from "next/server";
import { auditLogs } from "@/db/schema";
import { db } from "@/db/client";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { createOAuthState } from "@/lib/oauth-state-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";
import {
  MELHOR_ENVIO_PROVIDER,
  melhorEnvioAuthorizeUrl,
  melhorEnvioOAuthConfigured,
} from "@/lib/shipping-integrations-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  if (!melhorEnvioOAuthConfigured()) {
    return NextResponse.json({ error: "melhor_envio_oauth_not_configured" }, { status: 409 });
  }

  const state = createOAuthState({
    companyId: context.company.id,
    userId: context.user.id,
    provider: MELHOR_ENVIO_PROVIDER,
  });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.connect",
    entityType: "integration_credentials",
    entityId: context.company.id,
    metadata: { provider: MELHOR_ENVIO_PROVIDER, step: "start" },
  });

  return NextResponse.redirect(melhorEnvioAuthorizeUrl(state));
}
