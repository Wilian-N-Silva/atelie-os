export type ReplenishmentPriority = "critical" | "warning" | "watch";

export type ReplenishmentPlanInput = {
  available: number;
  minStock: number;
  orderDemand: number;
  productionDemand: number;
};

export type ReplenishmentPlan = {
  targetStock: number;
  demand: number;
  shortage: number;
  suggestedQty: number;
  priority: ReplenishmentPriority;
};

export type ReplenishmentSuggestion = ReplenishmentPlan & {
  itemId: string;
  sku: string;
  code: string;
  name: string;
  variant: string | null;
  type: string;
  unit: string;
  physical: number;
  reserved: number;
  inCure: number;
  blocked: number;
  available: number;
  minStock: number;
  orderDemand: number;
  productionDemand: number;
};

function roundQty(value: number) {
  return Math.round(value * 1000) / 1000;
}

export function buildReplenishmentPlan(input: ReplenishmentPlanInput): ReplenishmentPlan {
  const available = Number.isFinite(input.available) ? input.available : 0;
  const minStock = Math.max(0, Number.isFinite(input.minStock) ? input.minStock : 0);
  const orderDemand = Math.max(0, Number.isFinite(input.orderDemand) ? input.orderDemand : 0);
  const productionDemand = Math.max(0, Number.isFinite(input.productionDemand) ? input.productionDemand : 0);
  const demand = roundQty(orderDemand + productionDemand);
  const targetStock = roundQty(minStock + demand);
  const shortage = roundQty(Math.max(0, targetStock - available));
  const suggestedQty = roundQty(shortage);
  const coverage = targetStock > 0 ? available / targetStock : 1;

  return {
    targetStock,
    demand,
    shortage,
    suggestedQty,
    priority: available <= 0 || coverage <= 0.25 ? "critical" : shortage > 0 ? "warning" : "watch",
  };
}

export function shouldShowReplenishment(plan: ReplenishmentPlan, input: ReplenishmentPlanInput) {
  return plan.suggestedQty > 0 || input.orderDemand > 0 || input.productionDemand > 0 || input.available < input.minStock;
}
