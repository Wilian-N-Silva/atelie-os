import { strict as assert } from "node:assert";
import test from "node:test";
import { cleanMaterialLotAllocations, summarizeMaterialLotOptions } from "@/lib/material-lots";

test("cleanMaterialLotAllocations normalizes and merges allocations", () => {
  assert.deepEqual(cleanMaterialLotAllocations([
    { itemId: "item-1", sku: " cer-soj ", lot: " L-1 ", quantity: 2 },
    { itemId: "item-1", sku: "CER-SOJ", lot: "L-1", quantity: 1.2345 },
    { itemId: "item-1", sku: "CER-SOJ", lot: "", quantity: 1 },
    { itemId: "item-2", sku: "ESS-LAV", lot: "L-2", quantity: 0 },
  ]), [
    { itemId: "item-1", sku: "CER-SOJ", lot: "L-1", quantity: 3.235 },
  ]);
});

test("summarizeMaterialLotOptions returns positive lot balances with weighted cost", () => {
  assert.deepEqual(summarizeMaterialLotOptions([
    { itemId: "item-1", movementType: "purchase_entry", quantity: "10", metadata: { lot: "L-1", unitCost: 20 }, occurredAt: "2026-01-01T00:00:00.000Z" },
    { itemId: "item-1", movementType: "purchase_entry", quantity: "5", metadata: { lot: "L-1", unitCost: 32 }, occurredAt: "2026-01-02T00:00:00.000Z" },
    { itemId: "item-1", movementType: "production_consumption", quantity: "4", metadata: { materialLot: "L-1" }, occurredAt: "2026-01-03T00:00:00.000Z" },
    { itemId: "item-1", movementType: "purchase_entry", quantity: "2", metadata: { lot: "L-0", unitCost: 10 }, occurredAt: "2026-01-01T00:00:00.000Z" },
    { itemId: "item-1", movementType: "loss", quantity: "2", metadata: { lot: "L-0" }, occurredAt: "2026-01-04T00:00:00.000Z" },
  ]), [
    {
      itemId: "item-1",
      lot: "L-1",
      available: 11,
      unitCost: 24,
      lastMovementAt: "2026-01-03T00:00:00.000Z",
    },
  ]);
});
