import { normalizeLabelSheet, BARCODE_TYPE_OPTIONS, defaultLabelSheets, type BarcodeType, type LabelSheet } from "@/lib/label-sheets";
import { DEFAULT_LABEL_TEMPLATES, createLabelTemplate, normalizeElement, type LabelField, type LabelTemplate, type LabelTarget } from "@/lib/label-templates";

export type StoredLabelSettings = Record<string, unknown> & {
  labelSheets?: LabelSheet[];
  labelTemplates?: LabelTemplate[];
  defaultBarcodeType?: BarcodeType;
};

const BARCODE_TYPES = new Set(BARCODE_TYPE_OPTIONS.map((option) => option.value));
const TARGETS = new Set<LabelTarget>(["item", "lote", "op", "pedido", "local"]);
const FIELDS = new Set<LabelField>([
  "name", "variant", "sku", "code", "barcode", "lot", "prodDate", "opNum", "productName",
  "planned", "recipe", "orderNum", "customer", "city", "channel", "locName", "locType",
]);

function finiteNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

export function normalizeBarcodeType(value: unknown): BarcodeType | null {
  return BARCODE_TYPES.has(value as BarcodeType) ? value as BarcodeType : null;
}

export function parseLabelSheet(value: unknown): LabelSheet | null {
  if (!value || typeof value !== "object") return null;
  const sheet = value as Partial<LabelSheet>;
  if (!sheet.id || !sheet.name || !sheet.code) return null;
  if (!sheet.cols || !sheet.rows || !sheet.labelW || !sheet.labelH) return null;

  const normalized = normalizeLabelSheet({
    id: String(sheet.id),
    name: String(sheet.name).trim(),
    brand: sheet.brand ? String(sheet.brand).trim() : undefined,
    code: String(sheet.code).trim().toUpperCase(),
    pageW: finiteNumber(sheet.pageW),
    pageH: finiteNumber(sheet.pageH),
    cols: Math.max(1, Math.round(Number(sheet.cols))),
    rows: Math.max(1, Math.round(Number(sheet.rows))),
    labelW: Number(sheet.labelW),
    labelH: Number(sheet.labelH),
    mTop: finiteNumber(sheet.mTop),
    mLeft: finiteNumber(sheet.mLeft),
    gutX: finiteNumber(sheet.gutX),
    gutY: finiteNumber(sheet.gutY),
    roll: Boolean(sheet.roll),
    shape: sheet.shape === "circle" ? "circle" : "rect",
  });

  if (!normalized.name || !normalized.code) return null;
  if (normalized.cols * normalized.rows > 200) return null;
  if (![normalized.pageW, normalized.pageH, normalized.labelW, normalized.labelH].every((number) => Number.isFinite(number) && number > 0)) {
    return null;
  }
  if (![normalized.mTop, normalized.mLeft, normalized.gutX, normalized.gutY].every((number) => Number.isFinite(number) && number >= 0)) {
    return null;
  }

  return normalized;
}

export function parseLabelSheets(value: unknown): LabelSheet[] | null {
  if (!Array.isArray(value)) return null;
  const sheets = value.map(parseLabelSheet);
  if (sheets.some((sheet) => !sheet)) return null;
  return sheets as LabelSheet[];
}

export function parseLabelTemplate(value: unknown): LabelTemplate | null {
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

export function parseLabelTemplates(value: unknown): LabelTemplate[] | null {
  if (!Array.isArray(value)) return null;
  const templates = value.map(parseLabelTemplate);
  if (templates.some((template) => !template)) return null;
  return templates as LabelTemplate[];
}

export function labelSettingsPayload(settings: StoredLabelSettings) {
  return {
    sheets: settings.labelSheets?.length ? settings.labelSheets : defaultLabelSheets(),
    templates: settings.labelTemplates?.length ? settings.labelTemplates : DEFAULT_LABEL_TEMPLATES,
    defaultBarcodeType: settings.defaultBarcodeType ?? "code128",
  };
}
