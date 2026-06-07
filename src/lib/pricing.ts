/**
 * Pure pricing math, shared by the API and the screen (live simulation).
 *
 * Margin is markup-on-price: margin = (price - cost) / price. The channel fee
 * (percent of sale) is taken on the same side, so:
 *
 *   suggestedPrice = totalCost / (1 - marginPct - feePct)
 *
 * Example (PRD 7.19): cost 26.10, margin 0.60 -> 26.10 / 0.40 = 65.25.
 */

export type PricingInputs = {
  /** Materials + packaging cost, from the active recipe when available. */
  recipeCost: number | null;
  /** Real average production cost, when there is finished-lot history. */
  averageCost: number | null;
  estimatedCost: number | null;
  laborCost: number;
  extraCost: number;
  /** Desired minimum margin as a fraction (0.6 = 60%). */
  minMargin: number;
  /** Optional channel fee as a fraction, for simulation. */
  channelFee: number;
  /** Practiced price the operator decided to charge. */
  practicedPrice: number | null;
};

export type PricingResult = {
  /** Preferred unit cost: real average overrides estimate/recipe when present. */
  baseCost: number;
  totalCost: number;
  suggestedPrice: number | null;
  practicedPrice: number | null;
  currentMargin: number | null;
  belowMin: boolean;
};

function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export function clampFraction(value: number) {
  if (!Number.isFinite(value) || value < 0) return 0;
  return value > 0.95 ? 0.95 : value;
}

/** Unit cost the price is built on. Real average cost wins over recipe/estimate. */
export function resolveBaseCost(inputs: Pick<PricingInputs, "recipeCost" | "averageCost" | "estimatedCost">) {
  return inputs.averageCost ?? inputs.recipeCost ?? inputs.estimatedCost ?? 0;
}

export function marginOf(price: number, totalCost: number): number | null {
  if (!Number.isFinite(price) || price <= 0) return null;
  return round2(((price - totalCost) / price) * 100) / 100;
}

export function computePricing(inputs: PricingInputs): PricingResult {
  const baseCost = resolveBaseCost(inputs);
  const totalCost = round2(baseCost + Math.max(0, inputs.laborCost) + Math.max(0, inputs.extraCost));

  const denom = 1 - clampFraction(inputs.minMargin) - clampFraction(inputs.channelFee);
  const suggestedPrice = denom > 0 ? round2(totalCost / denom) : null;

  const practicedPrice = inputs.practicedPrice && inputs.practicedPrice > 0 ? round2(inputs.practicedPrice) : null;
  const currentMargin = practicedPrice == null ? null : marginOf(practicedPrice, totalCost);
  const belowMin = practicedPrice != null && currentMargin != null && currentMargin < inputs.minMargin;

  return { baseCost, totalCost, suggestedPrice, practicedPrice, currentMargin, belowMin };
}
