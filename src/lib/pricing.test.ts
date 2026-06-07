import assert from "node:assert/strict";
import { test } from "node:test";
import { computePricing, marginOf, resolveBaseCost } from "@/lib/pricing";

const base = {
  recipeCost: null as number | null,
  averageCost: null as number | null,
  estimatedCost: null as number | null,
  laborCost: 0,
  extraCost: 0,
  minMargin: 0.6,
  channelFee: 0,
  practicedPrice: null as number | null,
};

test("suggested price matches the PRD markup example", () => {
  const result = computePricing({ ...base, recipeCost: 26.1, practicedPrice: 75 });
  assert.equal(result.totalCost, 26.1);
  assert.equal(result.suggestedPrice, 65.25); // 26.10 / (1 - 0.60)
  assert.equal(result.belowMin, false);
});

test("practiced price below the minimum margin is flagged", () => {
  const result = computePricing({ ...base, recipeCost: 26.1, practicedPrice: 50 });
  assert.equal(result.belowMin, true);
  assert.ok(result.currentMargin !== null && result.currentMargin < 0.6);
});

test("real average cost overrides recipe and estimate", () => {
  assert.equal(resolveBaseCost({ recipeCost: 10, averageCost: 12, estimatedCost: 8 }), 12);
  assert.equal(resolveBaseCost({ recipeCost: 10, averageCost: null, estimatedCost: 8 }), 10);
});

test("labor, extra cost, and channel fee feed the suggested price", () => {
  const result = computePricing({ ...base, recipeCost: 20, laborCost: 4, extraCost: 2, minMargin: 0.5, channelFee: 0.1 });
  assert.equal(result.totalCost, 26); // 20 + 4 + 2
  assert.equal(result.suggestedPrice, 65); // 26 / (1 - 0.5 - 0.1)
});

test("margin is null without a positive price", () => {
  assert.equal(marginOf(0, 10), null);
});
