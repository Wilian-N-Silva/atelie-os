import bwipjs from "bwip-js/browser";
import { normalizeEan13 } from "@/lib/barcode-encoders";
import type { BarcodeType } from "@/lib/label-sheets";

type RenderBarcodeSvgOptions = {
  code: string;
  type: BarcodeType;
  heightMm: number;
  widthMm?: number;
  scale?: number;
};

function normalizeCode128Text(code: string) {
  return String(code || "0").replace(/[^\x20-\x7E]/g, "").trim() || "0";
}

function normalizeCode39Text(code: string) {
  return String(code || "0").toUpperCase().replace(/[^A-Z0-9-. $/+%]/g, "") || "0";
}

function barcodeText(code: string, type: BarcodeType) {
  if (type === "ean13") return normalizeEan13(code);
  if (type === "code39") return normalizeCode39Text(code);
  return normalizeCode128Text(code);
}

function barcodeId(type: BarcodeType) {
  if (type === "code39") return "code39";
  if (type === "ean13") return "ean13";
  if (type === "qr") return "qrcode";
  return "code128";
}

function renderSvg(options: RenderBarcodeSvgOptions, fallback = true): { svg: string; text: string } {
  const { code, type, heightMm, widthMm, scale = 3 } = options;
  const text = type === "qr" ? String(code || "0") : barcodeText(code, type);
  const sizeMm = Math.max(8, Math.min(widthMm ?? heightMm, heightMm));
  const renderOptions = type === "qr"
    ? {
        bcid: "qrcode",
        text,
        scale,
        width: sizeMm,
        height: sizeMm,
        padding: 0,
        backgroundcolor: "FFFFFF",
        barcolor: "000000",
      }
    : {
        bcid: barcodeId(type),
        text,
        scale,
        height: Math.max(8, heightMm),
        includetext: false,
        paddingwidth: 8,
        paddingheight: 0,
        backgroundcolor: "FFFFFF",
        barcolor: "000000",
        ...(widthMm ? { width: widthMm } : {}),
      };

  try {
    return { svg: bwipjs.toSVG(renderOptions), text };
  } catch {
    if (!fallback || type === "code128") throw new Error(`Codigo invalido para ${type}: ${code}`);
    return renderSvg({ ...options, type: "code128" }, false);
  }
}

export function renderBarcodeSvg(options: RenderBarcodeSvgOptions) {
  try {
    return renderSvg(options);
  } catch {
    const text = normalizeCode128Text(options.code);
    const svg = `<svg viewBox="0 0 120 32" xmlns="http://www.w3.org/2000/svg"><rect width="120" height="32" fill="#fff"/><text x="60" y="18" text-anchor="middle" font-family="monospace" font-size="7" fill="#111">codigo invalido</text></svg>`;
    return { svg, text };
  }
}
