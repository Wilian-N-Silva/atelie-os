import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, items, recipeComponents, recipeVersions, recipes } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import type { Recipe } from "@/lib/domain";
import { RECIPE_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

const TEST_RESULTS = ["aprovado", "ajustar", "reprovado"] as const;

type RecipeComponentInput = { sku: string; name: string; qty: number; unit: string; loss: number };
type RecipeInput = {
  name: string;
  product: string;
  productName: string;
  yield: number;
  yieldUnit: string;
  cureDays: number;
  components: RecipeComponentInput[];
  tests: Recipe["tests"];
};

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNumber(value: unknown, min: number) {
  const number = Number(value);
  return Number.isFinite(number) && number >= min ? number : min;
}

function cleanTests(value: unknown): Recipe["tests"] {
  if (!Array.isArray(value)) return [];
  return value
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const test = entry as Recipe["tests"][number];
      const result = TEST_RESULTS.includes(test.result) ? test.result : "ajustar";
      return {
        date: cleanString(test.date, 40) || "hoje",
        qty: Math.max(0, Math.round(cleanNumber(test.qty, 0))),
        result,
        note: cleanString(test.note, 1000),
      };
    })
    .filter((test): test is Recipe["tests"][number] => Boolean(test));
}

function cleanRecipeInput(value: unknown): RecipeInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Partial<RecipeInput>;
  const name = cleanString(input.name, 120);
  const product = cleanString(input.product, 64).toUpperCase();
  const productName = cleanString(input.productName, 160) || product;
  if (!name || !product) return null;
  if (!Array.isArray(input.components) || !input.components.length) return null;

  const components = input.components
    .map((component) => ({
      sku: cleanString(component?.sku, 64).toUpperCase(),
      name: cleanString(component?.name, 160),
      qty: cleanNumber(component?.qty, 0),
      unit: cleanString(component?.unit, 16) || "un",
      loss: cleanNumber(component?.loss, 0),
    }))
    .filter((component) => component.sku && component.qty > 0);

  if (!components.length) return null;

  return {
    name,
    product,
    productName,
    yield: Math.max(1, Math.round(cleanNumber(input.yield, 1))),
    yieldUnit: cleanString(input.yieldUnit, 64) || "unidade",
    cureDays: Math.max(0, Math.round(cleanNumber(input.cureDays, 0))),
    components,
    tests: cleanTests(input.tests),
  };
}

function nextRecipeVersion(versions: string[]) {
  const max = versions.reduce((acc, version) => {
    const numeric = Number(version.replace(/\D/g, ""));
    return Number.isFinite(numeric) ? Math.max(acc, numeric) : acc;
  }, 0);
  return `v${max + 1}`;
}

async function listRecipes(companyId: string): Promise<Recipe[]> {
  const recipeRows = await db.query.recipes.findMany({
    where: eq(recipes.companyId, companyId),
    orderBy: (table, { asc }) => [asc(table.createdAt)],
  });
  if (!recipeRows.length) return [];

  const result: Recipe[] = [];
  for (const recipe of recipeRows) {
    const versions = await db.query.recipeVersions.findMany({
      where: eq(recipeVersions.recipeId, recipe.id),
      orderBy: (table, { asc }) => [asc(table.createdAt)],
    });

    for (const version of versions) {
      const components = await db.query.recipeComponents.findMany({
        where: eq(recipeComponents.recipeVersionId, version.id),
        orderBy: (table, { asc }) => [asc(table.position)],
      });

      result.push({
        id: version.id,
        name: recipe.name,
        product: recipe.productSku,
        productName: recipe.productName,
        version: version.version,
        status: version.status === "ativa" ? "ativa" : "rascunho",
        yield: Number(version.yieldQty),
        yieldUnit: version.yieldUnit,
        cureDays: version.cureDays,
        components: components.map((component) => ({
          sku: component.sku,
          name: component.name,
          qty: Number(component.quantity),
          unit: component.unit,
          loss: Number(component.loss),
        })),
        tests: (version.tests as Recipe["tests"]) ?? [],
      });
    }
  }

  return result;
}

async function itemIdsBySku(companyId: string, skus: string[]) {
  if (!skus.length) return new Map<string, string>();
  const rows = await db.query.items.findMany({
    where: and(eq(items.companyId, companyId), inArray(items.sku, skus)),
    columns: { id: true, sku: true },
  });
  return new Map(rows.map((item) => [item.sku, item.id]));
}

async function insertVersion(
  recipeId: string,
  version: string,
  input: RecipeInput,
  skuToItemId: Map<string, string>,
) {
  const [created] = await db
    .insert(recipeVersions)
    .values({
      recipeId,
      version,
      status: "rascunho",
      yieldQty: input.yield.toString(),
      yieldUnit: input.yieldUnit,
      cureDays: input.cureDays,
      tests: input.tests,
    })
    .returning({ id: recipeVersions.id });

  await db.insert(recipeComponents).values(input.components.map((component, index) => ({
    recipeVersionId: created.id,
    itemId: skuToItemId.get(component.sku) ?? null,
    sku: component.sku,
    name: component.name,
    quantity: component.qty.toString(),
    unit: component.unit,
    loss: component.loss.toString(),
    position: index,
  })));

  return created.id;
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  return NextResponse.json({ recipes: await listRecipes(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, RECIPE_WRITE_ROLES);
  if (roleError) return roleError;
  const body = await request.json().catch(() => null) as {
    mode?: unknown;
    baseVersionId?: unknown;
    recipe?: unknown;
  } | null;

  const mode = body?.mode === "version" ? "version" : "create";
  const input = cleanRecipeInput(body?.recipe);
  if (!input) return NextResponse.json({ error: "invalid_recipe" }, { status: 400 });

  const skuToItemId = await itemIdsBySku(context.company.id, [
    input.product,
    ...input.components.map((component) => component.sku),
  ]);

  if (mode === "version") {
    const baseVersionId = cleanString(body?.baseVersionId, 80);
    if (!baseVersionId) return NextResponse.json({ error: "invalid_base_version" }, { status: 400 });

    const baseVersion = await db.query.recipeVersions.findFirst({
      where: eq(recipeVersions.id, baseVersionId),
      columns: { id: true, recipeId: true },
    });
    if (!baseVersion) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

    const recipe = await db.query.recipes.findFirst({
      where: and(eq(recipes.companyId, context.company.id), eq(recipes.id, baseVersion.recipeId)),
      columns: { id: true },
    });
    if (!recipe) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

    const existing = await db.query.recipeVersions.findMany({
      where: eq(recipeVersions.recipeId, recipe.id),
      columns: { version: true },
    });
    const version = nextRecipeVersion(existing.map((row) => row.version));

    await db.transaction(async () => {
      const versionId = await insertVersion(recipe.id, version, input, skuToItemId);
      await db.insert(auditLogs).values({
        companyId: context.company.id,
        actorUserId: context.user.id,
        action: "recipe.update",
        entityType: "recipe_version",
        entityId: versionId,
        metadata: { recipeId: recipe.id, version, change: "new_version" },
      });
    });
  } else {
    await db.transaction(async () => {
      const [recipe] = await db
        .insert(recipes)
        .values({
          companyId: context.company.id,
          name: input.name,
          productItemId: skuToItemId.get(input.product) ?? null,
          productSku: input.product,
          productName: input.productName,
          createdByUserId: context.user.id,
        })
        .returning({ id: recipes.id });

      const versionId = await insertVersion(recipe.id, "v1", input, skuToItemId);

      await db.insert(auditLogs).values({
        companyId: context.company.id,
        actorUserId: context.user.id,
        action: "recipe.create",
        entityType: "recipe",
        entityId: recipe.id,
        metadata: { name: input.name, productSku: input.product, versionId },
      });
    });
  }

  return NextResponse.json({ recipes: await listRecipes(context.company.id) }, { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, RECIPE_WRITE_ROLES);
  if (roleError) return roleError;
  const body = await request.json().catch(() => null) as { versionId?: unknown; status?: unknown } | null;
  const versionId = cleanString(body?.versionId, 80);
  const status = body?.status === "ativa" ? "ativa" : body?.status === "rascunho" ? "rascunho" : null;
  if (!versionId || !status) return NextResponse.json({ error: "invalid_patch" }, { status: 400 });

  const version = await db.query.recipeVersions.findFirst({
    where: eq(recipeVersions.id, versionId),
    columns: { id: true, recipeId: true },
  });
  if (!version) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

  const recipe = await db.query.recipes.findFirst({
    where: and(eq(recipes.companyId, context.company.id), eq(recipes.id, version.recipeId)),
    columns: { id: true },
  });
  if (!recipe) return NextResponse.json({ error: "recipe_not_found" }, { status: 404 });

  await db.transaction(async () => {
    await db
      .update(recipeVersions)
      .set({ status, updatedAt: new Date() })
      .where(eq(recipeVersions.id, versionId));

    await db.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "recipe.update",
      entityType: "recipe_version",
      entityId: versionId,
      metadata: { recipeId: recipe.id, change: "status", status },
    });
  });

  return NextResponse.json({ recipes: await listRecipes(context.company.id) });
}
