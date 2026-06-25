import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import {
  labelSettingsPayload,
  normalizeBarcodeType,
  parseLabelSheets,
  parseLabelTemplates,
  type StoredLabelSettings,
} from "@/lib/label-settings";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

async function ensureCompanySettings(companyId: string) {
  const existing = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(companySettings)
    .values({ companyId })
    .returning();
  return created;
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const row = await ensureCompanySettings(contextResult.context.company.id);
  const settings = row.settings as StoredLabelSettings;
  if (!settings.labelTemplates?.length) {
    const defaults = labelSettingsPayload(settings).templates;
    await db
      .update(companySettings)
      .set({ settings: { ...settings, labelTemplates: defaults }, updatedAt: new Date() })
      .where(eq(companySettings.companyId, contextResult.context.company.id));
    return NextResponse.json(labelSettingsPayload({ ...settings, labelTemplates: defaults }));
  }
  return NextResponse.json(labelSettingsPayload(settings));
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as {
    sheets?: unknown;
    templates?: unknown;
    defaultBarcodeType?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const current = await ensureCompanySettings(context.company.id);
  const currentSettings = current.settings as StoredLabelSettings;
  const nextSettings: StoredLabelSettings = { ...currentSettings };

  if (body.sheets !== undefined) {
    const sheets = parseLabelSheets(body.sheets);
    if (!sheets) return NextResponse.json({ error: "invalid_label_sheets" }, { status: 400 });
    nextSettings.labelSheets = sheets;
  }

  if (body.templates !== undefined) {
    const templates = parseLabelTemplates(body.templates);
    if (!templates) return NextResponse.json({ error: "invalid_label_templates" }, { status: 400 });
    nextSettings.labelTemplates = templates;
  }

  if (body.defaultBarcodeType !== undefined) {
    const defaultBarcodeType = normalizeBarcodeType(body.defaultBarcodeType);
    if (!defaultBarcodeType) return NextResponse.json({ error: "invalid_barcode_type" }, { status: 400 });
    nextSettings.defaultBarcodeType = defaultBarcodeType;
  }

  await db
    .update(companySettings)
    .set({ settings: nextSettings, updatedAt: new Date() })
    .where(eq(companySettings.companyId, context.company.id));

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "branding.update",
    entityType: "label_settings",
    entityId: context.company.id,
    metadata: {
      changedSheets: body.sheets !== undefined,
      changedTemplates: body.templates !== undefined,
      changedDefaultBarcodeType: body.defaultBarcodeType !== undefined,
    },
  });

  return NextResponse.json(labelSettingsPayload(nextSettings));
}
