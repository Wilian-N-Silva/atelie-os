import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  disconnectMelhorEnvio,
  getMelhorEnvioAccessToken,
  melhorEnvioOAuthConfigured,
  readMelhorEnvioCredential,
} from "@/lib/shipping-integrations-server";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type ShippingSettings = {
  melhorEnvioEnabled?: boolean;
  originZip?: string;
  originCity?: string;
  defaultService?: string;
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanSettings(value: unknown): ShippingSettings {
  return value && typeof value === "object" ? value as ShippingSettings : {};
}

async function getSettings(companyId: string) {
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
  const all = cleanSettings(row?.settings?.shipping);
  const credential = await readMelhorEnvioCredential(companyId);
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
  const nextShipping: ShippingSettings = {
    ...currentShipping,
    melhorEnvioEnabled: !!body?.melhorEnvioEnabled,
    originZip: cleanString(body?.originZip, 16),
    originCity: cleanString(body?.originCity, 80),
    defaultService: cleanString(body?.defaultService, 80) || "manual",
  };

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
        hasMelhorEnvioToken: (await readMelhorEnvioCredential(context.company.id)).connected,
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
  const settings = await getSettings(contextResult.context.company.id);

  if (!destinationZip || weightG <= 0) return NextResponse.json({ error: "invalid_quote" }, { status: 400 });
  if (!settings.melhorEnvioEnabled || !settings.hasMelhorEnvioToken) {
    return NextResponse.json({
      quote: {
        mode: "manual",
        available: false,
        message: "Preencha frete, etiqueta e rastreio manualmente ou conecte a conta do Melhor Envio.",
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

  await db.insert(auditLogs).values({
    companyId: contextResult.context.company.id,
    actorUserId: contextResult.context.user.id,
    action: "shipping.quote",
    entityType: "shipping",
    entityId: contextResult.context.company.id,
    metadata: { provider: "melhor_envio", destinationZip, weightG },
  });

  return NextResponse.json({
    quote: {
      mode: "melhor_envio",
      available: false,
      message: "Melhor Envio conectado com credencial protegida. A cotacao externa sera ativada quando o endpoint live for liberado.",
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
