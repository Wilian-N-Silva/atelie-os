import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildReplenishmentPlan, shouldShowReplenishment } from "@/lib/replenishment";

describe("buildReplenishmentPlan", () => {
  it("suggests enough to cover minimum stock and known demand", () => {
    assert.deepEqual(
      buildReplenishmentPlan({
        available: 3,
        minStock: 5,
        orderDemand: 2,
        productionDemand: 4,
      }),
      {
        targetStock: 11,
        demand: 6,
        shortage: 8,
        suggestedQty: 8,
        priority: "warning",
      },
    );
  });

  it("marks zero available stock as critical", () => {
    assert.equal(
      buildReplenishmentPlan({
        available: 0,
        minStock: 1,
        orderDemand: 0,
        productionDemand: 0,
      }).priority,
      "critical",
    );
  });

  it("keeps watch items visible when they have demand but no shortage", () => {
    const input = {
      available: 20,
      minStock: 5,
      orderDemand: 3,
      productionDemand: 0,
    };
    assert.equal(buildReplenishmentPlan(input).suggestedQty, 0);
    assert.equal(shouldShowReplenishment(buildReplenishmentPlan(input), input), true);
  });
});
