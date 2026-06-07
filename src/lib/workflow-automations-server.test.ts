import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { orderAutomationPlan, productionAutomationPlan } from "@/lib/workflow-automations-server";

describe("orderAutomationPlan", () => {
  it("reserves stock when payment becomes paid on a paid step", () => {
    assert.deepEqual(
      orderAutomationPlan({
        previous: { status: "aguardando_pagamento", paymentStatus: "aguardando" },
        next: { status: "pago", paymentStatus: "pago" },
        targetAutomation: "reserve_stock",
      }),
      { shouldReserve: true, shouldShip: false },
    );
  });

  it("ships stock when order moves to sent", () => {
    assert.deepEqual(
      orderAutomationPlan({
        previous: { status: "embalado", paymentStatus: "pago" },
        next: { status: "enviado", paymentStatus: "pago" },
        targetAutomation: "mark_shipped",
      }),
      { shouldReserve: false, shouldShip: true },
    );
  });

  it("does not duplicate reservation when payment was already paid", () => {
    assert.deepEqual(
      orderAutomationPlan({
        previous: { status: "pago", paymentStatus: "pago" },
        next: { status: "a_separar", paymentStatus: "pago" },
        targetAutomation: null,
      }),
      { shouldReserve: false, shouldShip: false },
    );
  });
});

describe("productionAutomationPlan", () => {
  it("consumes materials when production starts", () => {
    assert.deepEqual(
      productionAutomationPlan({
        previousStatus: "aguardando_materiais",
        nextStatus: "em_producao",
        targetAutomation: "start_production",
      }),
      { shouldConsume: true, shouldOutput: false, shouldRelease: false },
    );
  });

  it("creates output when production enters cure", () => {
    assert.deepEqual(
      productionAutomationPlan({
        previousStatus: "em_producao",
        nextStatus: "em_cura",
        targetAutomation: "block_stock_availability",
      }),
      { shouldConsume: false, shouldOutput: true, shouldRelease: false },
    );
  });

  it("releases produced stock when lot is approved", () => {
    assert.deepEqual(
      productionAutomationPlan({
        previousStatus: "aguardando_revisao",
        nextStatus: "liberada",
        targetAutomation: "release_stock_availability",
      }),
      { shouldConsume: false, shouldOutput: false, shouldRelease: true },
    );
  });
});
