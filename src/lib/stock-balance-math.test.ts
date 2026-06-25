import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLocationStockMovement,
  applyStockMovement,
  emptyStockBalance,
  normalizeBalance,
  type StockMovementBalanceInput,
} from "@/lib/stock-balance-math";

test("applyStockMovement tracks aggregate block and release balances", () => {
  const balance = {
    ...emptyStockBalance(),
    physical: 10,
  };

  applyStockMovement(balance, { type: "block", quantity: "4", toLocationType: "blocked" });
  assert.deepEqual(normalizeBalance(balance), {
    physical: 10,
    reserved: 0,
    inCure: 0,
    blocked: 4,
    available: 6,
  });

  applyStockMovement(balance, { type: "release", quantity: "1.5", toLocationType: null });
  assert.deepEqual(normalizeBalance(balance), {
    physical: 10,
    reserved: 0,
    inCure: 0,
    blocked: 2.5,
    available: 7.5,
  });
});

test("applyLocationStockMovement moves blocked stock between normal and blocked locations", () => {
  const normalLocation = {
    ...emptyStockBalance(),
    physical: 10,
  };
  const blockedLocation = emptyStockBalance();

  const blockMovement = {
    type: "block",
    quantity: "4",
    fromLocationId: "loc-normal",
    toLocationId: "loc-blocked",
    fromLocationType: "shelf",
    toLocationType: "blocked",
  } satisfies StockMovementBalanceInput;

  applyLocationStockMovement(normalLocation, blockMovement, "loc-normal");
  applyLocationStockMovement(blockedLocation, blockMovement, "loc-blocked");

  assert.deepEqual(normalizeBalance(normalLocation), {
    physical: 6,
    reserved: 0,
    inCure: 0,
    blocked: 0,
    available: 6,
  });
  assert.deepEqual(normalizeBalance(blockedLocation), {
    physical: 4,
    reserved: 0,
    inCure: 0,
    blocked: 4,
    available: 0,
  });

  const releaseMovement = {
    type: "release",
    quantity: "1.5",
    fromLocationId: "loc-blocked",
    toLocationId: "loc-normal",
    fromLocationType: "blocked",
    toLocationType: "shelf",
  } satisfies StockMovementBalanceInput;

  applyLocationStockMovement(normalLocation, releaseMovement, "loc-normal");
  applyLocationStockMovement(blockedLocation, releaseMovement, "loc-blocked");

  assert.deepEqual(normalizeBalance(normalLocation), {
    physical: 7.5,
    reserved: 0,
    inCure: 0,
    blocked: 0,
    available: 7.5,
  });
  assert.deepEqual(normalizeBalance(blockedLocation), {
    physical: 2.5,
    reserved: 0,
    inCure: 0,
    blocked: 2.5,
    available: 0,
  });
});

test("production release transfers cured stock into available physical stock", () => {
  const aggregate = emptyStockBalance();

  applyStockMovement(aggregate, { type: "production_output", quantity: "10", toLocationType: "cure" });
  assert.deepEqual(normalizeBalance(aggregate), {
    physical: 10,
    reserved: 0,
    inCure: 10,
    blocked: 0,
    available: 0,
  });

  applyStockMovement(aggregate, { type: "transfer", quantity: "7", fromLocationType: "cure", toLocationType: "shelf" });
  assert.deepEqual(normalizeBalance(aggregate), {
    physical: 10,
    reserved: 0,
    inCure: 3,
    blocked: 0,
    available: 7,
  });

  const cure = emptyStockBalance();
  const shelf = emptyStockBalance();
  const movement = {
    type: "transfer",
    quantity: "7",
    fromLocationId: "cure",
    toLocationId: "shelf",
    fromLocationType: "cure",
    toLocationType: "shelf",
  } satisfies StockMovementBalanceInput;

  cure.physical = 10;
  cure.inCure = 10;
  applyLocationStockMovement(cure, movement, "cure");
  applyLocationStockMovement(shelf, movement, "shelf");

  assert.deepEqual(normalizeBalance(cure), {
    physical: 3,
    reserved: 0,
    inCure: 3,
    blocked: 0,
    available: 0,
  });
  assert.deepEqual(normalizeBalance(shelf), {
    physical: 7,
    reserved: 0,
    inCure: 0,
    blocked: 0,
    available: 7,
  });
});
