import assert from "node:assert/strict";
import { test } from "node:test";
import { countDivergence, countSummary, stockCountAdjustments } from "@/lib/stock-count";

test("divergence is null until counted", () => {
  assert.equal(countDivergence(10, null), null);
  assert.equal(countDivergence(10, 10), 0);
  assert.equal(countDivergence(10, 7), -3);
  assert.equal(countDivergence(10, 12), 2);
});

test("only counted, diverging lines become adjustments", () => {
  const adjustments = stockCountAdjustments([
    { itemId: "a", sku: "A", expected: 10, counted: 8 },
    { itemId: "b", sku: "B", expected: 5, counted: 5 },
    { itemId: "c", sku: "C", expected: 2, counted: null },
    { itemId: "d", sku: "D", expected: 0, counted: 3 },
  ]);
  assert.deepEqual(adjustments, [
    { itemId: "a", sku: "A", direction: "decrease", quantity: 2 },
    { itemId: "d", sku: "D", direction: "increase", quantity: 3 },
  ]);
});

test("summary counts counted and divergent lines", () => {
  const summary = countSummary([
    { itemId: "a", sku: "A", expected: 10, counted: 8 },
    { itemId: "b", sku: "B", expected: 5, counted: 5 },
    { itemId: "c", sku: "C", expected: 2, counted: null },
  ]);
  assert.deepEqual(summary, { total: 3, counted: 2, divergent: 1 });
});
