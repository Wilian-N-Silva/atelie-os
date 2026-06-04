import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, productionOrders, recipeVersions, recipes } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import type { ProductionOrder } from "@/lib/domain";

export const runtime = "nodejs";

type ProductionPatch = Partial<Pick<ProductionOrder, "status" | "progress" | "lot" | "cureUntil" | "cureDayLeft">>;

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNullableString(value: unknown, max: number) {
  const cleaned = cleanString(value, max);
  return cleaned || null;
}

function cleanNumber(value: unknown, min: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? number : min;
}

function cleanOptionalInt(value: unknown) {
  if (value == null) return null;
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : null;
}

function toRow(row: typeof productionOrders.$inferSelect): ProductionOrder {
  return {
    id: row.id,
    code: row.code,
    num: row.number,
    product: row.productSku,
    productName: row.productName,
    recipe: row.recipeName,
    recipeVer: row.recipeVersion,
    planned: Number(row.planned),
    status: row.status as ProductionOrder["status"],
    date: row.plannedDateLabel,
    resp: row.responsible,
    progress: row.progress ?? undefined,
    lot: row.lot ?? undefined,
    cureUntil: row.cureUntil ?? undefined,
    cureDayLeft: row.cureDayLeft ?? undefined,
  };
}

async function listProduction(companyId: string): Promise<ProductionOrder[]> {
  const rows = await db.query.productionOrders.findMany({
    where: eq(productionOrders.companyId, companyId),
    orderBy: (table, { desc }) => [desc(table.createdAt)],
  });
  return rows.map(toRow);
}

async function nextSequence(companyId: string) {
  const rows = await db.query.productionOrders.findMany({
    where: eq(productionOrders.companyId, companyId),
    columns: { number: true, code: true },
  });
  const max = rows.reduce((acc, row) => {
    const fromNumber = Number(row.number.replace(/\D/g, ""));
    const fromCode = Number(row.code.replace(/\D/g, ""));
    return Math.max(acc, Number.isFinite(fromNumber) ? fromNumber : 0, Number.isFinite(fromCode) ? fromCode : 0);
  }, 208);
  return max + 1;
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  return NextResponse.json({ production: await listProduction(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { production?: unknown } | null;
  if (!body?.production || typeof body.production !== "object") {
    return NextResponse.json({ error: "invalid_production" }, { status: 400 });
  }

  const input = body.production as {
    recipeVersionId?: unknown;
    planned?: unknown;
    plannedDateLabel?: unknown;
    responsible?: unknown;
  };

  const recipeVersionId = cleanString(input.recipeVersionId, 80);
  if (!recipeVersionId) return NextResponse.json({ error: "invalid_recipe_version" }, { status: 400 });

  const version = await db.query.recipeVersions.findFirst({
    where: eq(recipeVersions.id, recipeVersionId),
    columns: { id: true, version: true, recipeId: true },
  });
  if (!version) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.companyId, context.company.id), eq(recipes.id, version.recipeId)),
    columns: { id: true, name: true, productItemId: true, productSku: true, productName: true },
  });
  if (!recipe) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

  const planned = Math.max(1, Math.round(cleanNumber(input.planned, 1)));
  const plannedDateLabel = cleanString(input.plannedDateLabel, 40) || "a definir";
  const responsible = cleanString(input.responsible, 80) || "Equipe";

  const seq = await nextSequence(context.company.id);
  const code = `0301${String(seq).padStart(8, "0")}`;
  const number = `OP-${seq}`;

  await db.transaction(async () => {
    const [order] = await db
      .insert(productionOrders)
      .values({
        companyId: context.company.id,
        code,
        number,
        productItemId: recipe.productItemId,
        productSku: recipe.productSku,
        productName: recipe.productName,
        recipeVersionId: version.id,
        recipeName: recipe.name,
        recipeVersion: version.version,
        planned: planned.toString(),
        status: "aguardando_materiais",
        plannedDateLabel,
        responsible,
        source: "manual",
        createdByUserId: context.user.id,
      })
      .returning({ id: productionOrders.id });

    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "production.create",
      entityType: "production_order",
      entityId: order.id,
      metadata: { code, number, recipeVersionId: version.id, source: "manual" },
    });
  });

  return NextResponse.json({ production: await listProduction(context.company.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { productionId?: unknown; patch?: unknown } | null;
  const productionId = cleanString(body?.productionId, 80);
  if (!productionId || !body?.patch || typeof body.patch !== "object") {
    return NextResponse.json({ error: "invalid_patch" }, { status: 400 });
  }

  const existing = await db.query.productionOrders.findFirst({
    where: and(eq(productionOrders.companyId, context.company.id), eq(productionOrders.id, productionId)),
  });
  if (!existing) return NextResponse.json({ error: "production_not_found" }, { status: 404 });

  const patch = body.patch as ProductionPatch;
  const nextStatus = patch.status !== undefined ? cleanString(patch.status, 64) : "";
  const update: Partial<typeof productionOrders.$inferInsert> = { updatedAt: new Date() };
  if (nextStatus) update.status = nextStatus;
  if (patch.progress !== undefined) update.progress = cleanOptionalInt(patch.progress);
  if (patch.lot !== undefined) update.lot = cleanNullableString(patch.lot, 80);
  if (patch.cureUntil !== undefined) update.cureUntil = cleanNullableString(patch.cureUntil, 40);
  if (patch.cureDayLeft !== undefined) update.cureDayLeft = cleanOptionalInt(patch.cureDayLeft);

  await db.transaction(async () => {
    await db
      .update(productionOrders)
      .set(update)
      .where(and(eq(productionOrders.companyId, context.company.id), eq(productionOrders.id, productionId)));

    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "production.update",
      entityType: "production_order",
      entityId: productionId,
      metadata: {
        previous: { status: existing.status },
        next: { status: nextStatus || existing.status },
      },
    });
  });

  return NextResponse.json({ production: await listProduction(context.company.id) });
}
