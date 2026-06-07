import assert from "node:assert/strict";
import { test } from "node:test";
import { expandStockTargets, kitAvailableFromComponents, type KitComponent } from "@/lib/kit-composition";

test("plain lines pass through with itemId as the source key", () => {
  const targets = expandStockTargets(
    [{ itemId: "vela-1", quantity: 2, sku: "VEL-LAV-156" }],
    new Map(),
  );
  assert.deepEqual(targets, [{ itemId: "vela-1", quantity: 2, sku: "VEL-LAV-156", sourceKey: "vela-1" }]);
});

test("virtual kit lines decompose into components (qty x perKit)", () => {
  const components: KitComponent[] = [
    { itemId: "vela-1", sku: "VEL-LAV-156", perKit: 1 },
    { itemId: "vela-2", sku: "VEL-CAP-156", perKit: 2 },
  ];
  const targets = expandStockTargets(
    [{ itemId: "kit-1", quantity: 3, sku: "KIT-RIT" }],
    new Map([["kit-1", components]]),
  );
  assert.deepEqual(targets, [
    { itemId: "vela-1", quantity: 3, sku: "VEL-LAV-156", sourceKey: "kit_kit-1_vela-1" },
    { itemId: "vela-2", quantity: 6, sku: "VEL-CAP-156", sourceKey: "kit_kit-1_vela-2" },
  ]);
});

test("kit availability is the limiting component", () => {
  const components: KitComponent[] = [
    { itemId: "vela-1", sku: "A", perKit: 1 },
    { itemId: "vela-2", sku: "B", perKit: 2 },
  ];
  const available = new Map([["vela-1", 10], ["vela-2", 6]]);
  // vela-1 supports 10 kits, vela-2 supports floor(6/2)=3 -> 3
  assert.equal(kitAvailableFromComponents(components, available), 3);
});

test("missing component stock yields zero kits", () => {
  const components: KitComponent[] = [{ itemId: "x", sku: "X", perKit: 1 }];
  assert.equal(kitAvailableFromComponents(components, new Map()), 0);
});
