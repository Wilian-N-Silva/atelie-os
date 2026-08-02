import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateInitialTotalCost,
  calculateInitialUnitCost,
  parseInitialInventoryPayload,
} from "@/lib/initial-inventory-utils";

test("calculateInitialUnitCost derives unit cost from total purchase amount", () => {
  assert.equal(calculateInitialUnitCost(24, null, 120), 5);
  assert.equal(calculateInitialTotalCost(24, 5, null), 120);
});

test("calculateInitialUnitCost keeps explicit unit cost when both values are present", () => {
  assert.equal(calculateInitialUnitCost(10, 2.5, 99), 2.5);
  assert.equal(calculateInitialTotalCost(10, 2.5, 99), 99);
});

test("parseInitialInventoryPayload accepts initial item presets and rejects duplicate SKUs", () => {
  const ok = parseInitialInventoryPayload({
    items: [
      {
        sku: "emb-vidro-tampa",
        name: "Vidro com tampa",
        type: "packaging",
        baseUnitId: "unit-id",
        defaultLocationId: "loc-id",
        quantity: "12",
        totalCost: "60",
      },
    ],
  });
  assert.equal("input" in ok, true);
  if ("input" in ok) {
    assert.equal(ok.input.items[0].sku, "EMB-VIDRO-TAMPA");
    assert.equal(ok.input.items[0].unitCost, 5);
  }

  assert.deepEqual(parseInitialInventoryPayload({
    items: [
      { sku: "A", name: "Item A", type: "raw_material", baseUnitId: "unit-id" },
      { sku: "a", name: "Item A", type: "raw_material", baseUnitId: "unit-id" },
    ],
  }), { error: "duplicate_sku_in_batch" });
});
