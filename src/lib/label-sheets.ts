import * as React from "react";
import { LABEL_SHEETS, type LabelSheetBase } from "@/lib/domain";

export type LabelSheet = LabelSheetBase & {
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

function defaultGutter(total: number, margin: number, count: number, size: number) {
  if (count <= 1) return 0;
  return Math.max(0, +(total - margin * 2 - count * size).toFixed(2)) / (count - 1);
}

export function normalizeLabelSheet(sheet: LabelSheetBase & Partial<LabelSheet>): LabelSheet {
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

export function useLabelSheets() {
  const [sheets, setLocalSheets] = React.useState<LabelSheet[]>(() => defaultLabelSheets());

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/label-settings", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { sheets?: LabelSheet[] } | null) => {
        if (alive && payload?.sheets) setLocalSheets(payload.sheets.map(normalizeLabelSheet));
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  const setSheets = React.useCallback((updater: React.SetStateAction<LabelSheet[]>) => {
    setLocalSheets((current) => {
      const next = typeof updater === "function"
        ? (updater as (value: LabelSheet[]) => LabelSheet[])(current)
        : updater;

      void fetch("/api/app/label-settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ sheets: next }),
      }).catch(() => null);

      return next;
    });
  }, []);

  return [sheets, setSheets] as const;
}

export function useBarcodeType() {
  const [barcodeType, setLocalBarcodeType] = React.useState<BarcodeType>(DEFAULT_BARCODE_TYPE);

  React.useEffect(() => {
    let alive = true;
    fetch("/api/app/label-settings", { cache: "no-store", credentials: "include" })
      .then((res) => res.ok ? res.json() : null)
      .then((payload: { defaultBarcodeType?: BarcodeType } | null) => {
        if (alive && payload?.defaultBarcodeType) setLocalBarcodeType(payload.defaultBarcodeType);
      })
      .catch(() => null);
    return () => { alive = false; };
  }, []);

  const setBarcodeType = React.useCallback((type: BarcodeType) => {
    setLocalBarcodeType(type);
    void fetch("/api/app/label-settings", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ defaultBarcodeType: type }),
    }).catch(() => null);
  }, []);

  return [barcodeType, setBarcodeType] as const;
}
