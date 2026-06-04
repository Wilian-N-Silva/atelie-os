"use client";

import { cn } from "@/lib/cn";
import type { BarcodeType } from "@/lib/label-sheets";

function barcodeSource(code: string, type: BarcodeType) {
  const raw = String(code || "0");
  if (type === "ean13") {
    const digits = raw.replace(/\D/g, "") || "0";
    return digits.padStart(13, "0").slice(-13);
  }
  if (type === "code39") {
    return `*${raw.toUpperCase().replace(/[^A-Z0-9-. $/+%]/g, "") || "0"}*`;
  }
  return raw;
}

function linearBarcodeSequence(code: string, type: BarcodeType) {
  const source = barcodeSource(code, type);
  const wide = type === "code39";
  const sequence: { width: number; black: boolean }[] = [
    { width: wide ? 3 : 2, black: true },
    { width: 1, black: false },
    { width: 1, black: true },
    { width: wide ? 2 : 1, black: false },
  ];

  source.split("").forEach((char, index) => {
    const value = char.charCodeAt(0) + index * (wide ? 7 : 3);
    sequence.push(
      { width: 1 + (value % (wide ? 2 : 3)), black: true },
      { width: wide ? 2 : 1 + ((value + 2) % 3), black: false },
      { width: 1 + ((value * 3 + 1) % (wide ? 3 : 2)), black: true },
      { width: wide ? 1 : 1 + ((value + 1) % 2), black: false },
    );
  });

  sequence.push(
    { width: wide ? 3 : 2, black: true },
    { width: 1, black: false },
    { width: wide ? 4 : 3, black: true },
  );

  return sequence;
}

function qrCells(code: string) {
  const source = String(code || "0");
  const size = 13;
  const seed = source.split("").reduce((sum, char, index) => sum + char.charCodeAt(0) * (index + 1), 0);
  const finder = (row: number, col: number, top: number, left: number) => {
    const r = row - top;
    const c = col - left;
    if (r < 0 || c < 0 || r > 4 || c > 4) return false;
    return r === 0 || r === 4 || c === 0 || c === 4 || (r === 2 && c === 2);
  };

  return Array.from({ length: size * size }, (_, index) => {
    const row = Math.floor(index / size);
    const col = index % size;
    if (finder(row, col, 0, 0) || finder(row, col, 0, 8) || finder(row, col, 8, 0)) return true;
    const char = source.charCodeAt((row * 3 + col * 5) % source.length);
    return (seed + char + row * 17 + col * 31) % 7 < 3;
  });
}

export function LabelBarcode({
  code,
  type,
  height = 54,
  scale = 2,
  className,
}: {
  code: string;
  type: BarcodeType;
  height?: number;
  scale?: number;
  className?: string;
}) {
  if (type === "qr") {
    const cells = qrCells(code);
    return (
      <div className={cn("lab-qr", className)} style={{ width: height, height }}>
        {cells.map((active, index) => (
          <span key={index} className={active ? "lab-qr-cell lab-qr-cell--on" : "lab-qr-cell"} />
        ))}
      </div>
    );
  }

  const sequence = linearBarcodeSequence(code, type);
  return (
    <div className={cn("lab-barcode", `lab-barcode--${type}`, className)} style={{ height }}>
      {sequence.map((bar, index) => (
        <div
          key={index}
          style={{ width: bar.width * scale, height: "100%", background: bar.black ? "#111" : "transparent" }}
        />
      ))}
    </div>
  );
}
