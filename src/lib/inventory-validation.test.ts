import assert from "node:assert/strict";
import test from "node:test";
import { parseInventoryMovementInput, validateManualMovementSourceCapacity } from "@/lib/inventory-validation";
import type { StockBalance } from "@/lib/stock-balance-math";

const balance: StockBalance = {
  physical: 5,
  reserved: 0,
  inCure: 0,
  blocked: 2,
  available: 3,
};

test("parseInventoryMovementInput rejects missing and malformed payloads", () => {
  assert.deepEqual(parseInventoryMovementInput(null), { error: "invalid_payload" });
  assert.deepEqual(parseInventoryMovementInput({ movementType: "unknown" }), { error: "invalid_movement_type" });
  assert.deepEqual(parseInventoryMovementInput({ movementType: "loss" }), { error: "item_required" });
  assert.deepEqual(parseInventoryMovementInput({
    movementType: "loss",
    itemId: "item-1",
    quantity: 0,
    reason: "Ajuste",
    fromLocationId: "loc-1",
  }), { error: "invalid_quantity" });
});

test("parseInventoryMovementInput enforces location requirements by movement type", () => {
  assert.deepEqual(parseInventoryMovementInput({
    movementType: "purchase_entry",
    itemId: "item-1",
    quantity: 1,
    reason: "Compra",
  }), { error: "to_location_required" });

  assert.deepEqual(parseInventoryMovementInput({
    movementType: "loss",
    itemId: "item-1",
    quantity: 1,
    reason: "Quebra",
  }), { error: "from_location_required" });

  assert.deepEqual(parseInventoryMovementInput({
    movementType: "transfer",
    itemId: "item-1",
    quantity: 1,
    reason: "Organizacao",
    fromLocationId: "loc-1",
    toLocationId: "loc-1",
  }), { error: "same_location" });
});

test("parseInventoryMovementInput trims fields and rounds quantities", () => {
  const parsed = parseInventoryMovementInput({
    movementType: "block",
    itemId: " item-1 ",
    quantity: "1.23456",
    reason: "  Revisao de qualidade  ",
    fromLocationId: " loc-1 ",
    toLocationId: " loc-blocked ",
  });

  assert.ok("input" in parsed);
  assert.deepEqual(parsed.input, {
    movementType: "block",
    itemId: "item-1",
    quantity: 1.235,
    reason: "Revisao de qualidade",
    fromLocationId: "loc-1",
    toLocationId: "loc-blocked",
  });
});

test("validateManualMovementSourceCapacity protects physical and blocked stock", () => {
  assert.equal(
    validateManualMovementSourceCapacity({ movementType: "transfer", quantity: 6 }, balance),
    "insufficient_source_stock",
  );
  assert.equal(
    validateManualMovementSourceCapacity({ movementType: "loss", quantity: 5 }, balance),
    null,
  );
  assert.equal(
    validateManualMovementSourceCapacity({ movementType: "block", quantity: 5.001 }, balance),
    "insufficient_source_stock",
  );
  assert.equal(
    validateManualMovementSourceCapacity({ movementType: "release", quantity: 2.001 }, balance),
    "insufficient_blocked_stock",
  );
  assert.equal(
    validateManualMovementSourceCapacity({ movementType: "purchase_entry", quantity: 999 }, balance),
    null,
  );
});
