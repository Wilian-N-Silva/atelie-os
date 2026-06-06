import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, items, recipeTests, recipeVersions, recipes } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";
import {
  RECIPE_TEST_CRITERIA,
  type RecipeTest,
  type RecipeTestCriterion,
  type RecipeTestResult,
  deriveRecipeTestResult,
  emptyRecipeTestCriteria,
} from "@/lib/domain";

export const runtime = "nodejs";

const CRITERION_RESULTS: RecipeTestResult[] = ["pendente", "aprovado", "ajustar", "reprovado"];
const CRITERION_BY_KEY = new Map(RECIPE_TEST_CRITERIA.map((criterion) => [criterion.key, criterion]));

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanCriteria(value: unknown): RecipeTestCriterion[] {
  const incoming = new Map<string, { result: RecipeTestResult; note: string }>();
  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const row = entry as Record<string, unknown>;
      const key = cleanString(row.key, 40);
      if (!CRITERION_BY_KEY.has(key as never)) continue;
      const result = CRITERION_RESULTS.includes(row.result as RecipeTestResult) ? (row.result as RecipeTestResult) : "pendente";
      incoming.set(key, { result, note: cleanString(row.note, 1000) });
    }
  }
  // Always rebuild from the fixed protocol order so the stored shape stays canonical.
  return RECIPE_TEST_CRITERIA.map((criterion) => ({
    key: criterion.key,
    label: criterion.label,
    result: incoming.get(criterion.key)?.result ?? "pendente",
    note: incoming.get(criterion.key)?.note ?? "",
  }));
}

function rowToTest(row: {
  id: string;
  recipeVersionId: string;
  code: string;
  seq: number;
  batchQty: number;
  status: string;
  criteria: Array<Record<string, unknown>>;
  note: string;
  testedAt: Date | null;
  createdAt: Date;
  recipeName: string;
  recipeVersion: string;
  productName: string;
}): RecipeTest {
  const criteria = cleanCriteria(row.criteria);
  return {
    id: row.id,
    recipeVersionId: row.recipeVersionId,
    recipeName: row.recipeName,
    recipeVersion: row.recipeVersion,
    productName: row.productName,
    code: row.code,
    seq: row.seq,
    batchQty: row.batchQty,
    status: (CRITERION_RESULTS.includes(row.status as RecipeTestResult) ? row.status : "pendente") as RecipeTestResult,
    criteria,
    note: row.note,
    testedAt: row.testedAt ? row.testedAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

async function listTests(companyId: string): Promise<RecipeTest[]> {
  const rows = await db
    .select({
      id: recipeTests.id,
      recipeVersionId: recipeTests.recipeVersionId,
      code: recipeTests.code,
      seq: recipeTests.seq,
      batchQty: recipeTests.batchQty,
      status: recipeTests.status,
      criteria: recipeTests.criteria,
      note: recipeTests.note,
      testedAt: recipeTests.testedAt,
      createdAt: recipeTests.createdAt,
      recipeVersion: recipeVersions.version,
      recipeName: recipes.name,
      productName: recipes.productName,
    })
    .from(recipeTests)
    .innerJoin(recipeVersions, eq(recipeTests.recipeVersionId, recipeVersions.id))
    .innerJoin(recipes, eq(recipeVersions.recipeId, recipes.id))
    .where(eq(recipeTests.companyId, companyId))
    .orderBy(recipeTests.createdAt);

  return rows.map(rowToTest);
}

async function generateTestCode(companyId: string): Promise<string> {
  for (let attempt = 0; attempt < 12; attempt += 1) {
    // 12-digit numeric internal code, distinct from SKUs (CLAUDE.md invariant).
    const code = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join("");
    const [testClash] = await db
      .select({ id: recipeTests.id })
      .from(recipeTests)
      .where(and(eq(recipeTests.companyId, companyId), eq(recipeTests.code, code)))
      .limit(1);
    if (testClash) continue;
    const [itemClash] = await db
      .select({ id: items.id })
      .from(items)
      .where(and(eq(items.companyId, companyId), eq(items.internalCode, code)))
      .limit(1);
    if (itemClash) continue;
    return code;
  }
  throw new Error("could_not_allocate_test_code");
}

async function resolveCompanyVersion(companyId: string, versionId: string) {
  const [row] = await db
    .select({ versionId: recipeVersions.id, recipeId: recipes.id })
    .from(recipeVersions)
    .innerJoin(recipes, eq(recipeVersions.recipeId, recipes.id))
    .where(and(eq(recipeVersions.id, versionId), eq(recipes.companyId, companyId)))
    .limit(1);
  return row ?? null;
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  return NextResponse.json({ tests: await listTests(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { recipeVersionId?: unknown; batchQty?: unknown } | null;
  const versionId = cleanString(body?.recipeVersionId, 80);
  if (!versionId) return NextResponse.json({ error: "invalid_recipe_version" }, { status: 400 });

  const version = await resolveCompanyVersion(context.company.id, versionId);
  if (!version) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

  const batchQtyRaw = Number(body?.batchQty);
  const batchQty = Number.isFinite(batchQtyRaw) && batchQtyRaw >= 1 ? Math.min(9999, Math.round(batchQtyRaw)) : 1;

  const existing = await db
    .select({ id: recipeTests.id })
    .from(recipeTests)
    .where(eq(recipeTests.recipeVersionId, versionId));
  const seq = existing.length + 1;

  const code = await generateTestCode(context.company.id);

  await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(recipeTests)
      .values({
        companyId: context.company.id,
        recipeVersionId: versionId,
        code,
        seq,
        batchQty,
        status: "pendente",
        criteria: emptyRecipeTestCriteria(),
        note: "",
        createdByUserId: context.user.id,
      })
      .returning({ id: recipeTests.id });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "recipe.test_create",
      entityType: "recipe_test",
      entityId: created.id,
      metadata: { recipeVersionId: versionId, code, seq, batchQty },
    });
  });

  return NextResponse.json({ tests: await listTests(context.company.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as { testId?: unknown; criteria?: unknown; note?: unknown } | null;
  const testId = cleanString(body?.testId, 80);
  if (!testId) return NextResponse.json({ error: "invalid_test" }, { status: 400 });

  const [test] = await db
    .select({ id: recipeTests.id })
    .from(recipeTests)
    .where(and(eq(recipeTests.companyId, context.company.id), eq(recipeTests.id, testId)))
    .limit(1);
  if (!test) return NextResponse.json({ error: "recipe_test_not_found" }, { status: 404 });

  const criteria = cleanCriteria(body?.criteria);
  const status = deriveRecipeTestResult(criteria);
  const note = cleanString(body?.note, 2000);

  await db.transaction(async (tx) => {
    await tx
      .update(recipeTests)
      .set({
        criteria,
        status,
        note,
        testedAt: new Date(),
        testedByUserId: context.user.id,
        updatedAt: new Date(),
      })
      .where(eq(recipeTests.id, testId));

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "recipe.test_submit",
      entityType: "recipe_test",
      entityId: testId,
      metadata: { status, results: criteria.map((criterion) => ({ key: criterion.key, result: criterion.result })) },
    });
  });

  return NextResponse.json({ tests: await listTests(context.company.id) });
}
