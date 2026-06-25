import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, companySettings, items, priceHistory, recipeComponents, recipeVersions, recipes, units } from "@/db/schema";
import { clampFraction, computePricing, type PricingResult } from "@/lib/pricing";
import { convertQuantityOrSame } from "@/lib/unit-conversion";

const DEFAULT_MIN_MARGIN = 0.5;

export type ChannelFeeRule = { key: string; label: string; feePct: number };
export type PricingSettings = {
  channelFeeRules: ChannelFeeRule[];
  laborDefaults: { hourlyRate: number };
};
export type PricingConfig = {
  minMargin: number;
  laborCost: number;
  laborMinutes: number;
  laborHourlyRate: number | null;
  extraCost: number;
  channelKey: string;
};

export type PricingProduct = PricingResult & {
  itemId: string;
  sku: string;
  name: string;
  variant: string | null;
  recipeCost: number | null;
  averageCost: number | null;
  estimatedCost: number | null;
  currentPrice: number | null;
  suggestedStored: number | null;
  config: PricingConfig;
  channelFee: number;
  settings: PricingSettings;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function readPricingConfig(metadata: Record<string, unknown> | null | undefined): PricingConfig {
  const raw = metadata && typeof metadata === "object" ? (metadata.pricing as Record<string, unknown> | undefined) : undefined;
  const minMargin = raw && Number.isFinite(Number(raw.minMargin)) ? clampFraction(Number(raw.minMargin)) : DEFAULT_MIN_MARGIN;
  const laborCost = raw && Number.isFinite(Number(raw.laborCost)) && Number(raw.laborCost) >= 0 ? Number(raw.laborCost) : 0;
  const laborMinutes = raw && Number.isFinite(Number(raw.laborMinutes)) && Number(raw.laborMinutes) >= 0 ? Number(raw.laborMinutes) : 0;
  const laborHourlyRate = raw && Number.isFinite(Number(raw.laborHourlyRate)) && Number(raw.laborHourlyRate) >= 0 ? Number(raw.laborHourlyRate) : null;
  const extraCost = raw && Number.isFinite(Number(raw.extraCost)) && Number(raw.extraCost) >= 0 ? Number(raw.extraCost) : 0;
  const channelKey = raw && typeof raw.channelKey === "string" && raw.channelKey.trim() ? raw.channelKey.trim().slice(0, 40) : "direct";
  return { minMargin, laborCost, laborMinutes, laborHourlyRate, extraCost, channelKey };
}

function laborCostFromConfig(config: PricingConfig, settings: PricingSettings) {
  const hourlyRate = config.laborHourlyRate ?? settings.laborDefaults.hourlyRate;
  const timeCost = config.laborMinutes > 0 && hourlyRate > 0 ? (config.laborMinutes / 60) * hourlyRate : 0;
  return Math.round((config.laborCost + timeCost) * 100) / 100;
}

function cleanChannelFeeRules(value: unknown): ChannelFeeRule[] {
  const fallback: ChannelFeeRule[] = [
    { key: "direct", label: "Venda direta", feePct: 0 },
    { key: "instagram", label: "Instagram", feePct: 0 },
    { key: "marketplace", label: "Marketplace", feePct: 0.16 },
  ];
  if (!Array.isArray(value)) return fallback;
  const rules = value.map((entry) => {
    if (!entry || typeof entry !== "object") return null;
    const raw = entry as Record<string, unknown>;
    const key = typeof raw.key === "string" ? raw.key.trim().toLowerCase().slice(0, 40) : "";
    const label = typeof raw.label === "string" ? raw.label.trim().slice(0, 80) : "";
    const feePct = clampFraction(Number(raw.feePct));
    if (!key || !label) return null;
    return { key, label, feePct };
  }).filter((rule): rule is ChannelFeeRule => Boolean(rule));
  return rules.length ? rules.slice(0, 20) : fallback;
}

function cleanPricingSettings(value: unknown): PricingSettings {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  const laborDefaults = raw.laborDefaults && typeof raw.laborDefaults === "object" ? raw.laborDefaults as Record<string, unknown> : {};
  const hourlyRate = Number(laborDefaults.hourlyRate);
  return {
    channelFeeRules: cleanChannelFeeRules(raw.channelFeeRules),
    laborDefaults: { hourlyRate: Number.isFinite(hourlyRate) && hourlyRate >= 0 ? Math.min(100000, hourlyRate) : 0 },
  };
}

async function loadPricingSettings(companyId: string): Promise<PricingSettings> {
  const row = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
  return cleanPricingSettings(row?.settings?.pricing);
}

export async function savePricingSettings(companyId: string, settings: PricingSettings) {
  const current = await db.query.companySettings.findFirst({
    where: eq(companySettings.companyId, companyId),
    columns: { settings: true },
  });
  const clean = cleanPricingSettings(settings);
  const nextSettings = { ...(current?.settings ?? {}), pricing: clean };
  await db.insert(companySettings)
    .values({ companyId, settings: nextSettings })
    .onConflictDoUpdate({
      target: companySettings.companyId,
      set: { settings: nextSettings, updatedAt: new Date() },
    });
  return clean;
}

async function itemCostMap(companyId: string) {
  const rows = await db
    .select({ id: items.id, sku: items.sku, unit: items.baseUnitId, averageCost: items.averageCost, estimatedCost: items.estimatedCost })
    .from(items)
    .where(eq(items.companyId, companyId));
  const unitRows = await db.query.units.findMany({
    where: eq(units.companyId, companyId),
    columns: { id: true, code: true },
  });
  const unitById = new Map(unitRows.map((unit) => [unit.id, unit.code]));
  const bySku = new Map<string, { cost: number; unit: string }>();
  for (const row of rows) {
    bySku.set(row.sku, {
      cost: toNumber(row.averageCost) ?? toNumber(row.estimatedCost) ?? 0,
      unit: row.unit ? unitById.get(row.unit) ?? "un" : "un",
    });
  }
  return bySku;
}

/** Map of product SKU -> active-recipe material+packaging cost per unit. */
async function recipeCostBySku(companyId: string, costBySku: Map<string, { cost: number; unit: string }>) {
  const recipeRows = await db
    .select({ id: recipes.id, productSku: recipes.productSku })
    .from(recipes)
    .where(eq(recipes.companyId, companyId));
  if (!recipeRows.length) return new Map<string, number>();

  const recipeIds = recipeRows.map((row) => row.id);
  const activeVersions = await db
    .select({ id: recipeVersions.id, recipeId: recipeVersions.recipeId, yieldQty: recipeVersions.yieldQty })
    .from(recipeVersions)
    .where(and(inArray(recipeVersions.recipeId, recipeIds), eq(recipeVersions.status, "ativa")));
  if (!activeVersions.length) return new Map<string, number>();

  const versionIds = activeVersions.map((row) => row.id);
  const components = await db
    .select({
      recipeVersionId: recipeComponents.recipeVersionId,
      sku: recipeComponents.sku,
      quantity: recipeComponents.quantity,
      unit: recipeComponents.unit,
      loss: recipeComponents.loss,
    })
    .from(recipeComponents)
    .where(inArray(recipeComponents.recipeVersionId, versionIds));

  const costByVersion = new Map<string, number>();
  for (const component of components) {
    const itemCost = costBySku.get(component.sku);
    const unitCost = itemCost?.cost ?? 0;
    const qty = toNumber(component.quantity) ?? 0;
    const convertedQty = convertQuantityOrSame(qty, component.unit, itemCost?.unit);
    const loss = toNumber(component.loss) ?? 0;
    const add = unitCost * convertedQty * (1 + loss / 100);
    costByVersion.set(component.recipeVersionId, (costByVersion.get(component.recipeVersionId) ?? 0) + add);
  }

  const recipeById = new Map(recipeRows.map((row) => [row.id, row.productSku]));
  const result = new Map<string, number>();
  for (const version of activeVersions) {
    const sku = recipeById.get(version.recipeId);
    if (!sku) continue;
    const yieldQty = toNumber(version.yieldQty) ?? 1;
    const perUnit = (costByVersion.get(version.id) ?? 0) / (yieldQty > 0 ? yieldQty : 1);
    if (!result.has(sku)) result.set(sku, Math.round(perUnit * 10000) / 10000);
  }
  return result;
}

export async function listPricing(companyId: string): Promise<PricingProduct[]> {
  const [costBySku, settings] = await Promise.all([itemCostMap(companyId), loadPricingSettings(companyId)]);
  const recipeCosts = await recipeCostBySku(companyId, costBySku);

  const sellable = await db
    .select({
      id: items.id,
      sku: items.sku,
      name: items.name,
      variant: items.variant,
      averageCost: items.averageCost,
      estimatedCost: items.estimatedCost,
      currentPrice: items.currentPrice,
      suggestedPrice: items.suggestedPrice,
      metadata: items.metadata,
    })
    .from(items)
    .where(and(eq(items.companyId, companyId), eq(items.sellable, true)))
    .orderBy(items.name);

  return sellable.map((item) => {
    const config = readPricingConfig(item.metadata);
    const channelFee = settings.channelFeeRules.find((rule) => rule.key === config.channelKey)?.feePct ?? 0;
    const recipeCost = recipeCosts.get(item.sku) ?? null;
    const averageCost = toNumber(item.averageCost);
    const estimatedCost = toNumber(item.estimatedCost);
    const currentPrice = toNumber(item.currentPrice);
    const result = computePricing({
      recipeCost,
      averageCost,
      estimatedCost,
      laborCost: laborCostFromConfig(config, settings),
      extraCost: config.extraCost,
      minMargin: config.minMargin,
      channelFee,
      practicedPrice: currentPrice,
    });
    return {
      ...result,
      itemId: item.id,
      sku: item.sku,
      name: item.name,
      variant: item.variant,
      recipeCost,
      averageCost,
      estimatedCost,
      currentPrice,
      suggestedStored: toNumber(item.suggestedPrice),
      config,
      channelFee,
      settings,
    };
  });
}

export type SavePricingInput = {
  itemId: string;
  practicedPrice: number;
  minMargin: number;
  laborCost: number;
  laborMinutes: number;
  laborHourlyRate: number | null;
  extraCost: number;
  channelKey: string;
};

export async function savePricing(companyId: string, actorUserId: string, input: SavePricingInput) {
  const [item] = await db
    .select({ id: items.id, currentPrice: items.currentPrice, metadata: items.metadata })
    .from(items)
    .where(and(eq(items.companyId, companyId), eq(items.id, input.itemId), eq(items.sellable, true)))
    .limit(1);
  if (!item) return { ok: false as const };

  const [costBySku, settings] = await Promise.all([itemCostMap(companyId), loadPricingSettings(companyId)]);
  const recipeCosts = await recipeCostBySku(companyId, costBySku);
  const [self] = await db
    .select({ sku: items.sku, averageCost: items.averageCost, estimatedCost: items.estimatedCost })
    .from(items)
    .where(eq(items.id, input.itemId))
    .limit(1);

  const config: PricingConfig = {
    minMargin: clampFraction(input.minMargin),
    laborCost: Math.max(0, input.laborCost),
    laborMinutes: Math.max(0, input.laborMinutes),
    laborHourlyRate: input.laborHourlyRate == null ? null : Math.max(0, input.laborHourlyRate),
    extraCost: Math.max(0, input.extraCost),
    channelKey: input.channelKey.trim() || "direct",
  };
  const channelFee = settings.channelFeeRules.find((rule) => rule.key === config.channelKey)?.feePct ?? 0;
  const result = computePricing({
    recipeCost: self ? recipeCosts.get(self.sku) ?? null : null,
    averageCost: self ? toNumber(self.averageCost) : null,
    estimatedCost: self ? toNumber(self.estimatedCost) : null,
    laborCost: laborCostFromConfig(config, settings),
    extraCost: config.extraCost,
    minMargin: config.minMargin,
    channelFee,
    practicedPrice: input.practicedPrice,
  });

  const previousPrice = toNumber(item.currentPrice);
  const price = Math.round(Math.max(0, input.practicedPrice) * 100) / 100;

  await db.transaction(async (tx) => {
    await tx
      .update(items)
      .set({
        currentPrice: price.toString(),
        suggestedPrice: result.suggestedPrice == null ? null : result.suggestedPrice.toString(),
        metadata: { ...(item.metadata ?? {}), pricing: config },
        updatedAt: new Date(),
      })
      .where(eq(items.id, input.itemId));

    await tx.insert(priceHistory).values({
      companyId,
      itemId: input.itemId,
      price: price.toString(),
      previousPrice: previousPrice == null ? null : previousPrice.toString(),
      cost: result.totalCost.toString(),
      marginPct: result.currentMargin == null ? null : (result.currentMargin * 100).toFixed(2),
      channelKey: config.channelKey,
      actorUserId,
    });

    await tx.insert(auditLogs).values({
      companyId,
      actorUserId,
      action: "price.update",
      entityType: "item",
      entityId: input.itemId,
      metadata: { price, previousPrice, totalCost: result.totalCost, minMargin: config.minMargin, channelKey: config.channelKey, channelFee, belowMin: result.belowMin },
    });
  });

  return { ok: true as const };
}

export async function listPriceHistory(companyId: string, itemId: string) {
  const rows = await db
    .select({
      price: priceHistory.price,
      previousPrice: priceHistory.previousPrice,
      marginPct: priceHistory.marginPct,
      createdAt: priceHistory.createdAt,
    })
    .from(priceHistory)
    .where(and(eq(priceHistory.companyId, companyId), eq(priceHistory.itemId, itemId)))
    .orderBy(priceHistory.createdAt);
  return rows.map((row) => ({
    price: toNumber(row.price) ?? 0,
    previousPrice: toNumber(row.previousPrice),
    marginPct: toNumber(row.marginPct),
    at: row.createdAt ? row.createdAt.toISOString() : null,
  }));
}
