export function normalizeScanValue(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function digits(value: string) {
  return value.replace(/\D/g, "");
}

export function scanCandidates(raw: string) {
  const trimmed = raw.trim();
  const values = new Set<string>();
  const add = (value: string) => {
    const normalized = normalizeScanValue(value).replace(/^\*+|\*+$/g, "");
    if (!normalized) return;
    values.add(normalized);
    const numeric = digits(normalized);
    if (numeric) {
      values.add(numeric);
      if (numeric.length === 13) values.add(numeric.slice(0, 12));
      if (numeric.length === 12) values.add(`0${numeric.slice(0, 11)}`);
      if (numeric.length === 11) values.add(`0${numeric}`);
    }
  };

  add(trimmed);
  const payload = trimmed.match(/(?:codigo|code|pedido|op|sku)[:=]\s*([A-Za-z0-9._*+-]+)/i)?.[1];
  if (payload) add(payload);
  return values;
}
