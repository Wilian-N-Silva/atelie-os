import { and, eq } from "drizzle-orm";
import {
  auditLogs,
  inventoryLocations,
  items,
  orderItems,
  productionOrders,
  recipeComponents,
  recipeVersions,
  stockMovements,
  workflowSteps,
  workflows,
} from "@/db/schema";
import { expandStockTargets } from "@/lib/kit-composition";

type AutomationEntity = "order" | "production";
type StockMovementInsert = typeof stockMovements.$inferInsert;

type AutomationTx = {
  query: {
    inventoryLocations: typeof import("@/db/client").db.query.inventoryLocations;
    items: typeof import("@/db/client").db.query.items;
    orderItems: typeof import("@/db/client").db.query.orderItems;
    productionOrders: typeof import("@/db/client").db.query.productionOrders;
    recipeComponents: typeof import("@/db/client").db.query.recipeComponents;
    recipeVersions: typeof import("@/db/client").db.query.recipeVersions;
    stockMovements: typeof import("@/db/client").db.query.stockMovements;
    workflowSteps: typeof import("@/db/client").db.query.workflowSteps;
    workflows: typeof import("@/db/client").db.query.workflows;
  };
  insert: typeof import("@/db/client").db.insert;
};

const ORDER_RESERVE_AUTOMATIONS = ["reserve_stock", "paid"];
const ORDER_SHIP_AUTOMATIONS = ["mark_shipped", "shipped"];

const PRODUCTION_CONSUME_AUTOMATIONS = ["start_production", "consume_materials", "in_production"];
const PRODUCTION_OUTPUT_AUTOMATIONS = ["create_output_lot", "block_stock_availability", "curing"];
const PRODUCTION_RELEASE_AUTOMATIONS = ["release_stock_availability", "released"];

function quantityString(value: number) {
  return String(Math.round(value * 1000) / 1000);
}

function automationIn(automation: string | null | undefined, options: string[]) {
  return options.includes(automation ?? "");
}

export function orderAutomationPlan(input: {
  previous: { status: string; paymentStatus: string };
  next: { status: string; paymentStatus: string };
  targetAutomation: string | null | undefined;
}) {
  const { previous, next, targetAutomation } = input;
  return {
    shouldReserve:
      previous.paymentStatus !== "pago" &&
      next.paymentStatus === "pago" &&
      (next.status === "pago" || automationIn(targetAutomation, ORDER_RESERVE_AUTOMATIONS)),
    shouldShip:
      previous.status !== next.status &&
      (next.status === "enviado" || automationIn(targetAutomation, ORDER_SHIP_AUTOMATIONS)),
  };
}

export function productionAutomationPlan(input: {
  previousStatus: string;
  nextStatus: string;
  targetAutomation: string | null | undefined;
}) {
  const { previousStatus, nextStatus, targetAutomation } = input;
  if (previousStatus === nextStatus) {
    return { shouldConsume: false, shouldOutput: false, shouldRelease: false };
  }

  return {
    shouldConsume: nextStatus === "em_producao" || automationIn(targetAutomation, PRODUCTION_CONSUME_AUTOMATIONS),
    shouldOutput: nextStatus === "em_cura" || automationIn(targetAutomation, PRODUCTION_OUTPUT_AUTOMATIONS),
    shouldRelease: nextStatus === "liberada" || automationIn(targetAutomation, PRODUCTION_RELEASE_AUTOMATIONS),
  };
}

async function targetStepAutomation(tx: AutomationTx, companyId: string, entity: AutomationEntity, status: string) {
  const workflow = await tx.query.workflows.findFirst({
    where: and(eq(workflows.companyId, companyId), eq(workflows.entity, entity), eq(workflows.isActive, true)),
    columns: { id: true },
  });
  if (!workflow) return null;

  const step = await tx.query.workflowSteps.findFirst({
    where: and(eq(workflowSteps.workflowId, workflow.id), eq(workflowSteps.technicalKey, status)),
    columns: { automationType: true },
  });
  return step?.automationType ?? null;
}

async function defaultLocationId(tx: AutomationTx, companyId: string, itemId: string | null, preferredType?: string) {
  if (preferredType) {
    const typed = await tx.query.inventoryLocations.findFirst({
      where: and(
        eq(inventoryLocations.companyId, companyId),
        eq(inventoryLocations.type, preferredType),
        eq(inventoryLocations.isActive, true),
      ),
      columns: { id: true },
    });
    if (typed) return typed.id;
  }

  if (itemId) {
    const item = await tx.query.items.findFirst({
      where: and(eq(items.companyId, companyId), eq(items.id, itemId)),
      columns: { defaultLocationId: true },
    });
    if (item?.defaultLocationId) return item.defaultLocationId;
  }

  const fallback = await tx.query.inventoryLocations.findFirst({
    where: and(eq(inventoryLocations.companyId, companyId), eq(inventoryLocations.isActive, true)),
    columns: { id: true },
  });
  return fallback?.id ?? null;
}

async function insertMovementOnce(tx: AutomationTx, movement: StockMovementInsert) {
  const existing = await tx.query.stockMovements.findFirst({
    where: and(
      eq(stockMovements.companyId, movement.companyId),
      eq(stockMovements.itemId, movement.itemId),
      eq(stockMovements.movementType, movement.movementType),
      eq(stockMovements.sourceType, movement.sourceType ?? ""),
      eq(stockMovements.sourceId, movement.sourceId ?? ""),
    ),
    columns: { id: true },
  });
  if (existing) return false;

  await tx.insert(stockMovements).values(movement);
  return true;
}

async function auditStockAutomation(
  tx: AutomationTx,
  companyId: string,
  actorUserId: string,
  entityType: string,
  entityId: string,
  metadata: Record<string, unknown>,
) {
  await tx.insert(auditLogs).values({
    companyId,
    actorUserId,
    action: "stock.adjust",
    entityType,
    entityId,
    metadata,
  });
}

export async function applyOrderWorkflowAutomations(input: {
  tx: AutomationTx;
  companyId: string;
  actorUserId: string;
  orderId: string;
  previous: { status: string; paymentStatus: string };
  next: { status: string; paymentStatus: string };
}) {
  const { tx, companyId, actorUserId, orderId, previous, next } = input;
  const automation = await targetStepAutomation(tx, companyId, "order", next.status);
  const { shouldReserve, shouldShip } = orderAutomationPlan({
    previous,
    next,
    targetAutomation: automation,
  });

  if (!shouldReserve && !shouldShip) return;

  const lines = await tx.query.orderItems.findMany({
    where: eq(orderItems.orderId, orderId),
    columns: { itemId: true, quantity: true, sku: true },
  });

  // Decompose virtual-kit lines into their component products; assembled kits
  // and plain items pass through and keep their original stock movements.
  // Imported lazily so the pure planners stay importable without a DB client.
  const { resolveVirtualKitComponents } = await import("@/lib/kit-composition-server");
  const virtualKits = await resolveVirtualKitComponents(companyId);
  const targets = expandStockTargets(
    lines.flatMap((line) => {
      const quantity = Number(line.quantity);
      if (!line.itemId || !Number.isFinite(quantity) || quantity <= 0) return [];
      return [{ itemId: line.itemId, quantity, sku: line.sku }];
    }),
    virtualKits,
  );

  let inserted = 0;
  for (const target of targets) {
    const locationId = await defaultLocationId(tx, companyId, target.itemId);

    if (shouldReserve) {
      const didInsert = await insertMovementOnce(tx, {
        companyId,
        itemId: target.itemId,
        movementType: "reservation",
        quantity: quantityString(target.quantity),
        toLocationId: locationId,
        reason: "Reserva automatica por pagamento confirmado",
        sourceType: "order.payment",
        sourceId: `${orderId}:${target.sourceKey}`,
        createdByUserId: actorUserId,
        metadata: { orderId, sku: target.sku },
      });
      if (didInsert) inserted += 1;
    }

    if (shouldShip) {
      const released = await insertMovementOnce(tx, {
        companyId,
        itemId: target.itemId,
        movementType: "reservation_release",
        quantity: quantityString(target.quantity),
        fromLocationId: locationId,
        reason: "Baixa automatica da reserva no envio",
        sourceType: "order.shipment.release",
        sourceId: `${orderId}:${target.sourceKey}`,
        createdByUserId: actorUserId,
        metadata: { orderId, sku: target.sku },
      });
      const shipped = await insertMovementOnce(tx, {
        companyId,
        itemId: target.itemId,
        movementType: "order_shipment",
        quantity: quantityString(target.quantity),
        fromLocationId: locationId,
        reason: "Saida automatica por pedido enviado",
        sourceType: "order.shipment",
        sourceId: `${orderId}:${target.sourceKey}`,
        createdByUserId: actorUserId,
        metadata: { orderId, sku: target.sku },
      });
      if (released) inserted += 1;
      if (shipped) inserted += 1;
    }
  }

  if (inserted > 0) {
    await auditStockAutomation(tx, companyId, actorUserId, "order", orderId, {
      automation: "order.workflow",
      previous,
      next,
      movements: inserted,
    });
  }
}

export async function applyProductionWorkflowAutomations(input: {
  tx: AutomationTx;
  companyId: string;
  actorUserId: string;
  productionId: string;
  previousStatus: string;
  nextStatus: string;
}) {
  const { tx, companyId, actorUserId, productionId, previousStatus, nextStatus } = input;
  const automation = await targetStepAutomation(tx, companyId, "production", nextStatus);
  const { shouldConsume, shouldOutput, shouldRelease } = productionAutomationPlan({
    previousStatus,
    nextStatus,
    targetAutomation: automation,
  });
  if (!shouldConsume && !shouldOutput && !shouldRelease) return;

  const production = await tx.query.productionOrders.findFirst({
    where: and(eq(productionOrders.companyId, companyId), eq(productionOrders.id, productionId)),
  });
  if (!production) return;

  let inserted = 0;
  if (shouldConsume && production.recipeVersionId) {
    const version = await tx.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, production.recipeVersionId),
      columns: { id: true, yieldQty: true },
    });
    const components = await tx.query.recipeComponents.findMany({
      where: eq(recipeComponents.recipeVersionId, production.recipeVersionId),
      columns: { itemId: true, quantity: true, loss: true, sku: true },
    });
    const planned = Number(production.planned);
    const yieldQty = Number(version?.yieldQty ?? 1) || 1;
    const multiplier = planned / yieldQty;

    for (const component of components) {
      if (!component.itemId) continue;
      const baseQty = Number(component.quantity);
      const lossPct = Number(component.loss);
      const quantity = baseQty * multiplier * (1 + (Number.isFinite(lossPct) ? lossPct : 0) / 100);
      if (!Number.isFinite(quantity) || quantity <= 0) continue;
      const locationId = await defaultLocationId(tx, companyId, component.itemId);
      const didInsert = await insertMovementOnce(tx, {
        companyId,
        itemId: component.itemId,
        movementType: "production_consumption",
        quantity: quantityString(quantity),
        fromLocationId: locationId,
        reason: "Consumo automatico ao iniciar producao",
        sourceType: "production.consumption",
        sourceId: `${productionId}:${component.itemId}`,
        createdByUserId: actorUserId,
        metadata: { productionId, sku: component.sku, planned, yieldQty },
      });
      if (didInsert) inserted += 1;
    }
  }

  if (shouldOutput && production.productItemId) {
    const cureLocationId = await defaultLocationId(tx, companyId, production.productItemId, "cure");
    const planned = Number(production.planned);
    if (Number.isFinite(planned) && planned > 0) {
      const didInsert = await insertMovementOnce(tx, {
        companyId,
        itemId: production.productItemId,
        movementType: "production_output",
        quantity: quantityString(planned),
        toLocationId: cureLocationId,
        reason: "Entrada automatica do lote produzido",
        sourceType: "production.output",
        sourceId: `${productionId}:${production.productItemId}`,
        createdByUserId: actorUserId,
        metadata: { productionId, sku: production.productSku, lot: production.lot },
      });
      if (didInsert) inserted += 1;
    }
  }

  if (shouldRelease && production.productItemId) {
    const cureLocationId = await defaultLocationId(tx, companyId, production.productItemId, "cure");
    const sellableLocationId = await defaultLocationId(tx, companyId, production.productItemId);
    const planned = Number(production.planned);
    if (Number.isFinite(planned) && planned > 0 && cureLocationId && sellableLocationId && cureLocationId !== sellableLocationId) {
      const didInsert = await insertMovementOnce(tx, {
        companyId,
        itemId: production.productItemId,
        movementType: "transfer",
        quantity: quantityString(planned),
        fromLocationId: cureLocationId,
        toLocationId: sellableLocationId,
        reason: "Liberacao automatica do lote para estoque",
        sourceType: "production.release",
        sourceId: `${productionId}:${production.productItemId}`,
        createdByUserId: actorUserId,
        metadata: { productionId, sku: production.productSku, lot: production.lot },
      });
      if (didInsert) inserted += 1;
    }
  }

  if (inserted > 0) {
    await auditStockAutomation(tx, companyId, actorUserId, "production_order", productionId, {
      automation: "production.workflow",
      previousStatus,
      nextStatus,
      movements: inserted,
    });
  }
}
