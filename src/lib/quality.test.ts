import assert from "node:assert/strict";
import test from "node:test";
import { qualityQuantities, qualityRequiresNote, statusForDecision } from "@/lib/quality";

test("qualityQuantities releases full approved lots", () => {
  assert.deepEqual(qualityQuantities("approve", 24, 0), { releaseQty: 24, lossQty: 0 });
  assert.deepEqual(qualityQuantities("approve_note", 24, 3), { releaseQty: 24, lossQty: 0 });
});

test("qualityQuantities supports partial lot approval", () => {
  assert.deepEqual(qualityQuantities("partial", 24, 4), { releaseQty: 20, lossQty: 4 });
});

test("qualityQuantities blocks or writes off non-sellable lots", () => {
  assert.deepEqual(qualityQuantities("block", 24, 0), { releaseQty: 0, lossQty: 0 });
  assert.deepEqual(qualityQuantities("loss", 24, 0), { releaseQty: 0, lossQty: 24 });
});

test("quality decisions map to production status and note requirements", () => {
  assert.equal(statusForDecision("partial"), "liberada");
  assert.equal(qualityRequiresNote("approve"), false);
  assert.equal(qualityRequiresNote("partial"), true);
  assert.equal(qualityRequiresNote("block"), true);
});
