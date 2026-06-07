import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  NUVEMSHOP_PROVIDER,
  nuvemshopAuthorizeUrl,
  nuvemshopOAuthConfigured,
} from "@/lib/nuvemshop-server";
import { createOAuthState } from "@/lib/oauth-state-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  if (!nuvemshopOAuthConfigured()) {
    return NextResponse.json({ error: "nuvemshop_oauth_not_configured" }, { status: 409 });
  }

  const state = createOAuthState({
    companyId: context.company.id,
    userId: context.user.id,
    provider: NUVEMSHOP_PROVIDER,
  });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "shipping.connect",
    entityType: "integration_credentials",
    entityId: context.company.id,
    metadata: { provider: NUVEMSHOP_PROVIDER, step: "start" },
  });

  return NextResponse.redirect(nuvemshopAuthorizeUrl(state));
}
