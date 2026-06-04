import * as React from "react";
import { LABEL_SHEETS, type DemoLabelSheet } from "@/lib/screen-fixtures";

export type LabelSheet = DemoLabelSheet & {
  brand?: string;
  pageW: number;
  pageH: number;
  mTop: number;
  mLeft: number;
  gutX: number;
  gutY: number;
};

export type LabelSheetInput = {
  name: string;
  brand?: string;
  code: string;
  pageW: number;
  pageH: number;
  cols: number;
  rows: number;
  labelW: number;
  labelH: number;
  mTop: number;
  mLeft: number;
  gutX: number;
  gutY: number;
  roll?: boolean;
};

export type BarcodeType = "code128" | "code39" | "ean13" | "qr";

export const BARCODE_TYPE_OPTIONS: { value: BarcodeType; label: string }[] = [
  { value: "code128", label: "Code 128 - mais compacto" },
  { value: "code39", label: "Code 39 - barras largas" },
  { value: "ean13", label: "EAN-13 - numerico" },
  { value: "qr", label: "QR Code - 2D" },
];

const DEFAULT_BARCODE_TYPE: BarcodeType = "code128";

let tenantLabelSheets = LABEL_SHEETS.map((sheet) => normalizeLabelSheet(sheet));
const listeners = new Set<() => void>();
let tenantBarcodeType: BarcodeType = DEFAULT_BARCODE_TYPE;
const barcodeListeners = new Set<() => void>();

function defaultGutter(total: number, margin: number, count: number, size: number) {
  if (count <= 1) return 0;
  return Math.max(0, +(total - margin * 2 - count * size).toFixed(2)) / (count - 1);
}

export function normalizeLabelSheet(sheet: DemoLabelSheet & Partial<LabelSheet>): LabelSheet {
  const pageW = sheet.pageW ?? 210;
  const pageH = sheet.pageH ?? (sheet.roll ? sheet.labelH : 297);
  const mTop = sheet.mTop ?? 9;
  const mLeft = sheet.mLeft ?? 7;
  return {
    ...sheet,
    pageW,
    pageH,
    mTop,
    mLeft,
    gutX: sheet.gutX ?? defaultGutter(pageW, mLeft, sheet.cols, sheet.labelW),
    gutY: sheet.gutY ?? defaultGutter(pageH, mTop, sheet.rows, sheet.labelH),
  };
}

export function defaultLabelSheets() {
  return LABEL_SHEETS.map((sheet) => normalizeLabelSheet(sheet));
}

export function createLabelSheet(input: LabelSheetInput): LabelSheet {
  const code = input.code.trim().toUpperCase() || "FOLHA";
  return normalizeLabelSheet({
    id: `sheet-${Date.now()}`,
    name: input.name.trim() || code,
    brand: input.brand?.trim() || "Personalizado",
    code,
    pageW: input.pageW,
    pageH: input.pageH,
    cols: input.cols,
    rows: input.rows,
    labelW: input.labelW,
    labelH: input.labelH,
    mTop: input.mTop,
    mLeft: input.mLeft,
    gutX: input.gutX,
    gutY: input.gutY,
    roll: input.roll,
  });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return tenantLabelSheets;
}

function getServerSnapshot() {
  return defaultLabelSheets();
}

function setTenantLabelSheets(updater: React.SetStateAction<LabelSheet[]>) {
  tenantLabelSheets = typeof updater === "function"
    ? (updater as (value: LabelSheet[]) => LabelSheet[])(tenantLabelSheets)
    : updater;
  listeners.forEach((listener) => listener());
}

export function useLabelSheets() {
  const sheets = React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  return [sheets, setTenantLabelSheets] as const;
}

function subscribeBarcode(listener: () => void) {
  barcodeListeners.add(listener);
  return () => barcodeListeners.delete(listener);
}

function getBarcodeSnapshot() {
  return tenantBarcodeType;
}

function setTenantBarcodeType(type: BarcodeType) {
  tenantBarcodeType = type;
  barcodeListeners.forEach((listener) => listener());
}

export function useBarcodeType() {
  const barcodeType = React.useSyncExternalStore(subscribeBarcode, getBarcodeSnapshot, () => DEFAULT_BARCODE_TYPE);
  return [barcodeType, setTenantBarcodeType] as const;
}
