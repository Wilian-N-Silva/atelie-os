import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companies, companyBrandSettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";
import type { BrandTheme } from "@/lib/theme";

export const runtime = "nodejs";

function isHex(value: unknown) {
  return /^#?[0-9a-fA-F]{3}$|^#?[0-9a-fA-F]{6}$/.test(String(value).trim());
}

function parseLogoUrl(value: unknown) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;

  const logo = value.trim();
  if (logo.length > 1_500_000) return undefined;
  if (/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(logo)) return logo;
  if (/^https:\/\/.+/i.test(logo)) return logo;
  return undefined;
}

function parseThemeTokens(value: unknown): BrandTheme | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object") return undefined;

  const theme = value as BrandTheme;
  if (!theme.colors || typeof theme.colors !== "object") return undefined;
  if (!["light", "dark", undefined].includes(theme.mode)) return undefined;
  if (!theme.colors.background || !theme.colors.foreground || !theme.colors.primary || !theme.colors.primaryForeground) {
    return undefined;
  }

  for (const color of Object.values(theme.colors)) {
    if (color !== undefined && !isHex(color)) return undefined;
  }

  return theme;
}

async function readBranding(companyId: string) {
  return db.query.companyBrandSettings.findFirst({
    where: eq(companyBrandSettings.companyId, companyId),
    columns: { logoUrl: true, activeThemeId: true, themeTokens: true },
  });
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const branding = await readBranding(context.company.id);

  return NextResponse.json({
    companyName: context.company.name,
    logoUrl: branding?.logoUrl ?? null,
    activeThemeId: branding?.activeThemeId ?? null,
    themeTokens: branding?.themeTokens ?? null,
  });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = (await request.json().catch(() => null)) as {
    companyName?: unknown;
    logoUrl?: unknown;
    themeTokens?: unknown;
  } | null;

  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const companyName = typeof body.companyName === "string" ? body.companyName.trim() : undefined;
  const logoUrl = parseLogoUrl(body.logoUrl);
  const themeTokens = parseThemeTokens(body.themeTokens);

  if (body.companyName !== undefined && !companyName) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  if (body.logoUrl !== undefined && logoUrl === undefined) {
    return NextResponse.json({ error: "invalid_logo" }, { status: 400 });
  }

  if (body.themeTokens !== undefined && !themeTokens) {
    return NextResponse.json({ error: "invalid_theme" }, { status: 400 });
  }

  if (companyName && companyName !== context.company.name) {
    await db
      .update(companies)
      .set({ name: companyName, updatedAt: new Date() })
      .where(eq(companies.id, context.company.id));
  }

  const current = await readBranding(context.company.id);
  const values = {
    logoUrl: logoUrl !== undefined ? logoUrl : current?.logoUrl ?? null,
    themeTokens: (themeTokens ?? current?.themeTokens ?? {}) as Record<string, unknown>,
    activeThemeId: null,
    updatedAt: new Date(),
  };

  if (current) {
    await db
      .update(companyBrandSettings)
      .set(values)
      .where(eq(companyBrandSettings.companyId, context.company.id));
  } else {
    await db.insert(companyBrandSettings).values({
      companyId: context.company.id,
      logoUrl: values.logoUrl,
      themeTokens: values.themeTokens,
      activeThemeId: values.activeThemeId,
    });
  }

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "branding.update",
    entityType: "company_brand_settings",
    entityId: context.company.id,
    metadata: {
      changedCompanyName: Boolean(companyName && companyName !== context.company.name),
      changedLogo: body.logoUrl !== undefined,
      changedTheme: body.themeTokens !== undefined,
    },
  });

  const updated = await readBranding(context.company.id);

  return NextResponse.json({
    companyName: companyName || context.company.name,
    logoUrl: updated?.logoUrl ?? null,
    activeThemeId: updated?.activeThemeId ?? null,
    themeTokens: updated?.themeTokens ?? null,
  });
}
