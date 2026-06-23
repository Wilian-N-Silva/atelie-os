import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { normalizeLabelSheet, BARCODE_TYPE_OPTIONS, defaultLabelSheets, type BarcodeType, type LabelSheet } from "@/lib/label-sheets";
import { DEFAULT_LABEL_TEMPLATES, createLabelTemplate, normalizeElement, type LabelField, type LabelTemplate, type LabelTarget } from "@/lib/label-templates";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

type StoredSettings = Record<string, unknown> & {
  labelSheets?: LabelSheet[];
  labelTemplates?: LabelTemplate[];
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
    shape: sheet.shape === "circle" ? "circle" : "rect",
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

const TARGETS = new Set<LabelTarget>(["item", "lote", "op", "pedido", "local"]);
const FIELDS = new Set<LabelField>([
  "name", "variant", "sku", "code", "barcode", "lot", "prodDate", "opNum", "productName",
  "planned", "recipe", "orderNum", "customer", "city", "channel", "locName", "locType",
]);

function parseTemplate(value: unknown): LabelTemplate | null {
  if (!value || typeof value !== "object") return null;
  const template = value as Partial<LabelTemplate>;
  if (!template.id || !template.name || !template.target) return null;
  if (!TARGETS.has(template.target)) return null;
  const fields = Array.isArray(template.fields)
    ? template.fields.filter((field): field is LabelField => FIELDS.has(field as LabelField))
    : [];
  const elements = Array.isArray(template.elements)
    ? template.elements.map(normalizeElement).filter(Boolean) as NonNullable<LabelTemplate["elements"]>
    : undefined;

  return createLabelTemplate({
    id: String(template.id),
    name: String(template.name),
    target: template.target,
    icon: String(template.icon || "tag"),
    w: Number(template.w),
    h: Number(template.h),
    desc: String(template.desc || ""),
    fields,
    elements,
  });
}

function parseTemplates(value: unknown): LabelTemplate[] | null {
  if (!Array.isArray(value)) return null;
  const templates = value.map(parseTemplate);
  if (templates.some((template) => !template)) return null;
  return templates as LabelTemplate[];
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
    templates: settings.labelTemplates?.length ? settings.labelTemplates : DEFAULT_LABEL_TEMPLATES,
    defaultBarcodeType: settings.defaultBarcodeType ?? "code128",
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const row = await ensureCompanySettings(contextResult.context.company.id);
  const settings = row.settings as StoredSettings;
  if (!settings.labelTemplates?.length) {
    await db
      .update(companySettings)
      .set({ settings: { ...settings, labelTemplates: DEFAULT_LABEL_TEMPLATES }, updatedAt: new Date() })
      .where(eq(companySettings.companyId, contextResult.context.company.id));
    return NextResponse.json(payloadFromSettings({ ...settings, labelTemplates: DEFAULT_LABEL_TEMPLATES }));
  }
  return NextResponse.json(payloadFromSettings(settings));
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
  const currentSettings = current.settings as StoredSettings;
  const nextSettings: StoredSettings = { ...currentSettings };

  if (body.sheets !== undefined) {
    const sheets = parseSheets(body.sheets);
    if (!sheets) return NextResponse.json({ error: "invalid_label_sheets" }, { status: 400 });
    nextSettings.labelSheets = sheets;
  }

  if (body.templates !== undefined) {
    const templates = parseTemplates(body.templates);
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

  return NextResponse.json(payloadFromSettings(nextSettings));
}
