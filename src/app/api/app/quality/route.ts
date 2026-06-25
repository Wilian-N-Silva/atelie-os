import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, inventoryLocations, productionOrders, stockMovements } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import {
  QC_CHECKLIST,
  isQualityDecision,
  qualityQuantities,
  qualityRequiresNote,
  statusForDecision,
  type QcChecklistItem,
} from "@/lib/quality";
import { applyProductionWorkflowAutomations } from "@/lib/workflow-automations-server";

export const runtime = "nodejs";

const REVIEW_STATUSES = ["em_cura", "aguardando_revisao"];

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanChecklist(value: unknown): QcChecklistItem[] {
  const checked = new Set<string>();
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (entry && typeof entry === "object" && (entry as Record<string, unknown>).checked === true) {
        checked.add(cleanString((entry as Record<string, unknown>).key, 40));
      }
    }
  }
  return QC_CHECKLIST.map((item) => ({ key: item.key, label: item.label, checked: checked.has(item.key) }));
}

async function listReviewLots(companyId: string) {
  const rows = await db.query.productionOrders.findMany({
    where: and(eq(productionOrders.companyId, companyId), inArray(productionOrders.status, REVIEW_STATUSES)),
    orderBy: (table, { desc: d }) => [d(table.createdAt)],
  });
  return rows.map((row) => ({
    id: row.id,
    num: row.number,
    productName: row.productName,
    lot: row.lot ?? null,
    planned: Number(row.planned),
    status: row.status,
    cureUntil: row.cureUntil ?? null,
    cureDayLeft: row.cureDayLeft ?? null,
    quality: (row.metadata as Record<string, unknown>)?.quality ?? null,
  }));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ lots: await listReviewLots(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const productionId = cleanString(body?.productionId, 80);
  const decision = body?.decision;
  if (!productionId || !isQualityDecision(decision)) {
    return NextResponse.json({ error: "invalid_quality_review" }, { status: 400 });
  }

  const production = await db.query.productionOrders.findFirst({
    where: and(eq(productionOrders.companyId, context.company.id), eq(productionOrders.id, productionId)),
  });
  if (!production) return NextResponse.json({ error: "production_not_found" }, { status: 404 });
  if (!REVIEW_STATUSES.includes(production.status)) {
    return NextResponse.json({ error: "lot_not_in_review" }, { status: 409 });
  }

  const checklist = cleanChecklist(body?.checklist);
  const note = cleanString(body?.note, 1000);
  if (qualityRequiresNote(decision) && !note) {
    return NextResponse.json({ error: "quality_note_required" }, { status: 400 });
  }
  const nextStatus = statusForDecision(decision);
  const planned = Number(production.planned);
  const lossQtyRaw = Number(body?.lossQty);
  const { lossQty, releaseQty } = qualityQuantities(decision, planned, lossQtyRaw);
  if (decision === "partial" && lossQty <= 0) {
    return NextResponse.json({ error: "partial_loss_qty_required" }, { status: 400 });
  }

  const quality = {
    decision,
    note,
    checklist,
    releaseQty,
    lossQty,
    reviewedByUserId: context.user.id,
    reviewedAt: new Date().toISOString(),
  };

  await db.transaction(async (tx) => {
    await tx
      .update(productionOrders)
      .set({ status: nextStatus, metadata: { ...(production.metadata ?? {}), quality }, updatedAt: new Date() })
      .where(eq(productionOrders.id, productionId));

    // Release (liberada) transfers cure -> sellable through the existing automation.
    await applyProductionWorkflowAutomations({
      tx,
      companyId: context.company.id,
      actorUserId: context.user.id,
      productionId,
      previousStatus: production.status,
      nextStatus,
    });

    if (lossQty > 0 && production.productItemId) {
      const cure = await tx.query.inventoryLocations.findFirst({
        where: and(eq(inventoryLocations.companyId, context.company.id), eq(inventoryLocations.type, "cure"), eq(inventoryLocations.isActive, true)),
        columns: { id: true },
      });
      await tx.insert(stockMovements).values({
        companyId: context.company.id,
        itemId: production.productItemId,
        movementType: "loss",
        quantity: lossQty.toString(),
        fromLocationId: cure?.id ?? null,
        reason: `Perda na revisao de qualidade ${production.lot ?? production.number}`,
        sourceType: "quality.loss",
        sourceId: `${productionId}:loss`,
        createdByUserId: context.user.id,
        metadata: { productionId, lot: production.lot, lossQty, decision },
      });
    }

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "production.update",
      entityType: "production_order",
      entityId: productionId,
      metadata: { operation: "quality_review", decision, previousStatus: production.status, nextStatus, releaseQty, lossQty: quality.lossQty },
    });
  });

  return NextResponse.json({ lots: await listReviewLots(context.company.id) });
}
