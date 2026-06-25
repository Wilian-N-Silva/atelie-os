import { scanCandidates } from "@/lib/scan-candidates";

export type InternalCodeKind =
  | "item"
  | "lot"
  | "production"
  | "order"
  | "location"
  | "volume"
  | "action"
  | "quantity"
  | "external";

const KIND_BY_PREFIX: Record<string, InternalCodeKind> = {
  "01": "item",
  "02": "lot",
  "03": "production",
  "04": "order",
  "05": "location",
  "06": "volume",
  "07": "action",
  "08": "quantity",
  "09": "external",
};

export function internalCodeKind(code: string): InternalCodeKind | null {
  const digits = code.replace(/\D/g, "");
  if (!/^\d{12}$/.test(digits)) return null;
  return KIND_BY_PREFIX[digits.slice(0, 2)] ?? null;
}

export function scanCodeKinds(raw: string) {
  const kinds = new Set<InternalCodeKind>();
  for (const value of scanCandidates(raw)) {
    const kind = internalCodeKind(value);
    if (kind) kinds.add(kind);
  }
  return kinds;
}
