"use client";

import { cn } from "@/lib/cn";
import { renderBarcodeSvg } from "@/lib/barcode-svg";
import type { BarcodeType } from "@/lib/label-sheets";

type LengthUnit = "px" | "mm";
const MM_PER_PX = 25.4 / 96;

function cssLength(value: number | string, unit: LengthUnit) {
  return typeof value === "number" ? `${value}${unit}` : value;
}

export function LabelBarcode({
  code,
  type,
  height = 54,
  scale = 2,
  unit = "px",
  maxWidth,
  className,
}: {
  code: string;
  type: BarcodeType;
  height?: number;
  scale?: number;
  unit?: LengthUnit;
  maxWidth?: number;
  className?: string;
}) {
  const heightMm = unit === "mm" ? height : Math.max(8, height * MM_PER_PX);
  const rendered = renderBarcodeSvg({
    code,
    type,
    heightMm,
    widthMm: unit === "mm" ? maxWidth : undefined,
    scale: unit === "mm" ? 4 : Math.max(2, Math.round(scale * 3)),
  });
  const width = type === "qr" ? height : maxWidth;
  return (
    <span
      className={cn(type === "qr" ? "lab-qr" : "lab-barcode", `lab-barcode--${type}`, className)}
      style={{ width: width ? cssLength(width, unit) : undefined, height: cssLength(height, unit) }}
      aria-label={`${type === "qr" ? "QR" : "Codigo"} ${rendered.text}`}
      dangerouslySetInnerHTML={{ __html: rendered.svg }}
    />
  );
}
