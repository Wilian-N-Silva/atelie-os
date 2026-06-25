import test from "node:test";
import assert from "node:assert/strict";
import { compatibleUnitCodes, convertQuantity, convertQuantityOrSame, roundUnitQuantity } from "@/lib/unit-conversion";

test("converts compatible mass and volume units", () => {
  assert.equal(convertQuantity(1000, "g", "kg"), 1);
  assert.equal(convertQuantity(1.5, "kg", "g"), 1500);
  assert.equal(convertQuantity(250, "ml", "l"), 0.25);
  assert.equal(convertQuantity(2, "l", "ml"), 2000);
});

test("keeps unit codes stable and rejects incompatible conversions", () => {
  assert.equal(convertQuantity(3, "un", "un"), 3);
  assert.equal(convertQuantity(3, "un", "kg"), null);
  assert.equal(convertQuantity(3, "box", "kg"), null);
  assert.equal(convertQuantityOrSame(3, "box", "kg"), 3);
});

test("lists compatible choices by unit kind", () => {
  assert.deepEqual(compatibleUnitCodes("kg"), ["kg", "g", "mg"]);
  assert.deepEqual(compatibleUnitCodes("ml"), ["l", "ml"]);
  assert.deepEqual(compatibleUnitCodes("un"), ["un"]);
  assert.deepEqual(compatibleUnitCodes("custom"), ["custom"]);
  assert.equal(roundUnitQuantity(0.333333), 0.333);
});
