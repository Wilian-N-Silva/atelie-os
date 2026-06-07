/** Minimal CSV builder. Uses ';' + CRLF for pt-BR Excel friendliness. */
export type CsvValue = string | number | null | undefined;

function escapeCell(value: CsvValue): string {
  const text = value == null ? "" : String(value);
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function toCsv(headers: string[], rows: CsvValue[][]): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(";"));
  // Leading BOM so Excel reads UTF-8 accents correctly.
  return "﻿" + lines.join("\r\n");
}
