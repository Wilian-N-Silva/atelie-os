import assert from "node:assert/strict";
import test from "node:test";
import { movementLineCost, summarizeLotTrace } from "@/lib/lot-trace";

test("movementLineCost rounds positive material costs", () => {
  assert.equal(movementLineCost(3.333, 2.5), 8.33);
  assert.equal(movementLineCost(0, 2.5), null);
  assert.equal(movementLineCost(2, null), null);
});

test("summarizeLotTrace computes real cost, release and loss totals", () => {
  const trace = summarizeLotTrace({
    productionId: "prod-1",
    productionCode: "030100000208",
    productionNum: "OP-208",
    lot: "020300000700",
    productName: "Vela Lavanda",
    planned: 10,
    status: "liberada",
    quality: { decision: "approve", lossQty: 1 },
    movements: [
      { id: "m1", type: "production_consumption", sku: "CER", itemName: "Cera", quantity: 5, lot: "L-CER", unitCost: 10, lineCost: 50, occurredAt: "", reason: null },
      { id: "m2", type: "production_consumption", sku: "ESS", itemName: "Essencia", quantity: 1, lot: null, unitCost: 20, lineCost: 20, occurredAt: "", reason: null },
      { id: "m3", type: "production_output", sku: "VEL", itemName: "Vela", quantity: 10, lot: "020300000700", unitCost: null, lineCost: null, occurredAt: "", reason: null },
      { id: "m4", type: "production_release", sku: "VEL", itemName: "Vela", quantity: 10, lot: "020300000700", unitCost: null, lineCost: null, occurredAt: "", reason: null },
    ],
  });

  assert.equal(trace.realCost, 70);
  assert.equal(trace.unitCost, 7);
  assert.equal(trace.outputQty, 10);
  assert.equal(trace.releasedQty, 10);
  assert.equal(trace.lossQty, 1);
});
