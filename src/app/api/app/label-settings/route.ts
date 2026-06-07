import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { normalizeLabelSheet, BARCODE_TYPE_OPTIONS, defaultLabelSheets, type BarcodeType, type LabelSheet } from "@/lib/label-sheets";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type StoredSettings = Record<string, unknown> & {
  labelSheets?: LabelSheet[];
  defaultBarcodeType?: BarcodeType;
};

const BARCODE_TYPES = new Set(BARCODE_TYPE_OPTIONS.map((option) => option.value));

function normalizeBarcodeType(value: unknown): BarcodeType | null {
  return BARCODE_TYPES.has(value as BarcodeType) ? value as BarcodeType : null;
}

function parseSheet(value: unknown): LabelSheet | null {
  if (!value || typeof value !== "object") return null;
  const sheet = value as Partial<LabelSheet>;
  if (!sheet.id || !sheet.name || !sheet.code) return null;
  if (!sheet.cols || !sheet.rows || !sheet.labelW || !sheet.labelH) return null;

  const normalized = normalizeLabelSheet({
    id: String(sheet.id),
    name: String(sheet.name).trim(),
    brand: sheet.brand ? String(sheet.brand).trim() : undefined,
    code: String(sheet.code).trim().toUpperCase(),
    pageW: Number(sheet.pageW),
    pageH: Number(sheet.pageH),
    cols: Math.max(1, Math.round(Number(sheet.cols))),
    rows: Math.max(1, Math.round(Number(sheet.rows))),
    labelW: Number(sheet.labelW),
    labelH: Number(sheet.labelH),
    mTop: Number(sheet.mTop),
    mLeft: Number(sheet.mLeft),
    gutX: Number(sheet.gutX),
    gutY: Number(sheet.gutY),
    roll: Boolean(sheet.roll),
  });

  if (!normalized.name || !normalized.code) return null;
  if (normalized.cols * normalized.rows > 200) return null;
  if (![normalized.pageW, normalized.pageH, normalized.labelW, normalized.labelH].every((value) => Number.isFinite(value) && value > 0)) {
    return null;
  }
  if (![normalized.mTop, normalized.mLeft, normalized.gutX, normalized.gutY].every((value) => Number.isFinite(value) && value >= 0)) {
    return null;
  }

  return normalized;
}

function parseSheets(value: unknown): LabelSheet[] | null {
  if (!Array.isArray(value)) return null;
  const sheets = value.map(parseSheet);
  if (sheets.some((sheet) => !sheet)) return null;
  return sheets as LabelSheet[];
}

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

function payloadFromSettings(settings: StoredSettings) {
  return {
    sheets: settings.labelSheets?.length ? settings.labelSheets : defaultLabelSheets(),
    defaultBarcodeType: settings.defaultBarcodeType ?? "code128",
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const row = await ensureCompanySettings(contextResult.context.company.id);
  return NextResponse.json(payloadFromSettings(row.settings as StoredSettings));
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as {
    sheets?: unknown;
    defaultBarcodeType?: unknown;
  } | null;
  if (!body) return NextResponse.json({ error: "invalid_body" }, { status: 400 });

  const current = await ensureCompanySettings(context.company.id);
  const currentSettings = current.settings as StoredSettings;
  const nextSettings: StoredSettings = { ...currentSettings };

  if (body.sheets !== undefined) {
    const sheets = parseSheets(body.sheets);
    if (!sheets) return NextResponse.json({ error: "invalid_label_sheets" }, { status: 400 });
    nextSettings.labelSheets = sheets;
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
      changedDefaultBarcodeType: body.defaultBarcodeType !== undefined,
    },
  });

  return NextResponse.json(payloadFromSettings(nextSettings));
}
