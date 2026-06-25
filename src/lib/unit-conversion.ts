export type UnitKind = "unit" | "mass" | "volume";

export type UnitDefinition = {
  code: string;
  kind: UnitKind;
  factorToBase: number;
};

const UNIT_DEFINITIONS: Record<string, UnitDefinition> = {
  un: { code: "un", kind: "unit", factorToBase: 1 },
  g: { code: "g", kind: "mass", factorToBase: 1 },
  kg: { code: "kg", kind: "mass", factorToBase: 1000 },
  mg: { code: "mg", kind: "mass", factorToBase: 0.001 },
  ml: { code: "ml", kind: "volume", factorToBase: 1 },
  l: { code: "l", kind: "volume", factorToBase: 1000 },
};

const UNIT_ORDER = ["un", "kg", "g", "mg", "l", "ml"];

function normalizeUnitCode(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

export function unitDefinition(code: string | null | undefined): UnitDefinition | null {
  return UNIT_DEFINITIONS[normalizeUnitCode(code)] ?? null;
}

export function compatibleUnitCodes(baseUnit: string | null | undefined) {
  const definition = unitDefinition(baseUnit);
  if (!definition) return [normalizeUnitCode(baseUnit) || "un"];
  return UNIT_ORDER.filter((code) => UNIT_DEFINITIONS[code]?.kind === definition.kind);
}

export function convertQuantity(
  quantity: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
): number | null {
  if (!Number.isFinite(quantity)) return null;
  const from = normalizeUnitCode(fromUnit);
  const to = normalizeUnitCode(toUnit);
  if (!from || !to || from === to) return quantity;

  const fromDefinition = unitDefinition(from);
  const toDefinition = unitDefinition(to);
  if (!fromDefinition || !toDefinition || fromDefinition.kind !== toDefinition.kind) return null;

  return (quantity * fromDefinition.factorToBase) / toDefinition.factorToBase;
}

export function convertQuantityOrSame(
  quantity: number,
  fromUnit: string | null | undefined,
  toUnit: string | null | undefined,
) {
  return convertQuantity(quantity, fromUnit, toUnit) ?? quantity;
}

export function roundUnitQuantity(value: number) {
  return Math.round(value * 1000) / 1000;
}
