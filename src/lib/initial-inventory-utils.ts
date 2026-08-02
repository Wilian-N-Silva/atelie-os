export type ItemType = "raw_material" | "packaging" | "finished_good" | "kit" | "auxiliary";

const ITEM_TYPES: ItemType[] = ["raw_material", "packaging", "finished_good", "kit", "auxiliary"];

export type InitialInventoryItemInput = {
  sku: string;
  name: string;
  type: ItemType;
  baseUnitId: string;
  categoryId: string | null;
  defaultLocationId: string | null;
  quantity: number;
  unitCost: number | null;
  totalCost: number | null;
  currentPrice: number | null;
  minStock: number;
  sellable: boolean;
  tracksLot: boolean;
  lot: string | null;
  expiresAt: string | null;
};

export type InitialInventoryRecipeInput = {
  name: string;
  productSku: string;
  productName: string;
  yieldQty: number;
  yieldUnit: string;
  cureDays: number;
  components: {
    sku: string;
    name: string;
    qty: number;
    unit: string;
    loss: number;
  }[];
};

export type InitialInventoryInput = {
  items: InitialInventoryItemInput[];
  recipes: InitialInventoryRecipeInput[];
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanOptionalString(value: unknown, max: number) {
  return cleanString(value, max) || null;
}

function cleanId(value: unknown) {
  return cleanString(value, 80);
}

function cleanNullableId(value: unknown) {
  return cleanId(value) || null;
}

function cleanNumber(value: unknown, min = 0) {
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(number) && number >= min ? number : min;
}

function cleanNullableNumber(value: unknown) {
  if (value === "" || value === null || value === undefined) return null;
  const number = typeof value === "string" ? Number(value.replace(",", ".")) : Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

export function calculateInitialUnitCost(quantity: number, unitCost: number | null, totalCost: number | null) {
  if (unitCost != null) return Math.round(unitCost * 10000) / 10000;
  if (totalCost != null && quantity > 0) return Math.round((totalCost / quantity) * 10000) / 10000;
  return null;
}

export function calculateInitialTotalCost(quantity: number, unitCost: number | null, totalCost: number | null) {
  if (totalCost != null) return Math.round(totalCost * 100) / 100;
  if (unitCost != null && quantity > 0) return Math.round(unitCost * quantity * 100) / 100;
  return null;
}

function parseItem(value: unknown): InitialInventoryItemInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const sku = cleanString(raw.sku, 64).toUpperCase();
  const name = cleanString(raw.name, 160);
  const type = ITEM_TYPES.includes(raw.type as ItemType) ? raw.type as ItemType : null;
  const baseUnitId = cleanId(raw.baseUnitId);
  const quantity = Math.round(cleanNumber(raw.quantity, 0) * 1000) / 1000;
  if (!sku || !name || !type || !baseUnitId) return null;

  const unitCost = cleanNullableNumber(raw.unitCost);
  const totalCost = cleanNullableNumber(raw.totalCost);
  return {
    sku,
    name,
    type,
    baseUnitId,
    categoryId: cleanNullableId(raw.categoryId),
    defaultLocationId: cleanNullableId(raw.defaultLocationId),
    quantity,
    unitCost: calculateInitialUnitCost(quantity, unitCost, totalCost),
    totalCost: calculateInitialTotalCost(quantity, unitCost, totalCost),
    currentPrice: cleanNullableNumber(raw.currentPrice),
    minStock: Math.round(cleanNumber(raw.minStock, 0) * 1000) / 1000,
    sellable: Boolean(raw.sellable),
    tracksLot: Boolean(raw.tracksLot),
    lot: cleanOptionalString(raw.lot, 80),
    expiresAt: cleanOptionalString(raw.expiresAt, 40),
  };
}

function parseRecipe(value: unknown): InitialInventoryRecipeInput | null {
  if (!value || typeof value !== "object") return null;
  const raw = value as Record<string, unknown>;
  const name = cleanString(raw.name, 120);
  const productSku = cleanString(raw.productSku, 64).toUpperCase();
  const productName = cleanString(raw.productName, 160) || productSku;
  const components = Array.isArray(raw.components)
    ? raw.components.map((entry) => {
        if (!entry || typeof entry !== "object") return null;
        const component = entry as Record<string, unknown>;
        const sku = cleanString(component.sku, 64).toUpperCase();
        const qty = cleanNumber(component.qty, 0);
        if (!sku || qty <= 0) return null;
        return {
          sku,
          name: cleanString(component.name, 160) || sku,
          qty,
          unit: cleanString(component.unit, 16) || "un",
          loss: cleanNumber(component.loss, 0),
        };
      }).filter((entry): entry is InitialInventoryRecipeInput["components"][number] => Boolean(entry))
    : [];
  if (!name || !productSku || !components.length) return null;
  return {
    name,
    productSku,
    productName,
    yieldQty: Math.max(1, cleanNumber(raw.yieldQty, 1)),
    yieldUnit: cleanString(raw.yieldUnit, 64) || "unidade",
    cureDays: Math.round(cleanNumber(raw.cureDays, 0)),
    components,
  };
}

export function parseInitialInventoryPayload(payload: unknown): { input: InitialInventoryInput } | { error: string } {
  if (!payload || typeof payload !== "object") return { error: "invalid_payload" };
  const raw = payload as Record<string, unknown>;
  const parsedItems = Array.isArray(raw.items) ? raw.items.map(parseItem).filter((item): item is InitialInventoryItemInput => Boolean(item)) : [];
  const parsedRecipes = Array.isArray(raw.recipes) ? raw.recipes.map(parseRecipe).filter((recipe): recipe is InitialInventoryRecipeInput => Boolean(recipe)) : [];

  if (!parsedItems.length && !parsedRecipes.length) return { error: "empty_initial_inventory" };
  const seen = new Set<string>();
  for (const item of parsedItems) {
    if (seen.has(item.sku)) return { error: "duplicate_sku_in_batch" };
    seen.add(item.sku);
  }
  return { input: { items: parsedItems, recipes: parsedRecipes } };
}
