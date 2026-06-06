import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { items, recipeComponents, recipeVersions, recipes } from "@/db/schema";
import type { KitComponent } from "@/lib/kit-composition";

function toNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Components (per single kit) for every virtual kit in the company, keyed by the
 * kit item id. Composition comes from the kit's active recipe; only components
 * with a resolved itemId are usable for stock movements.
 */
export async function resolveVirtualKitComponents(companyId: string): Promise<Map<string, KitComponent[]>> {
  const kitRows = await db
    .select({ id: items.id, sku: items.sku })
    .from(items)
    .where(and(
      eq(items.companyId, companyId),
      eq(items.type, "kit"),
      sql`${items.metadata} ->> 'kitMode' = 'virtual'`,
    ));
  if (!kitRows.length) return new Map();

  const kitIds = kitRows.map((row) => row.id);
  const recipeRows = await db
    .select({ id: recipes.id, productItemId: recipes.productItemId })
    .from(recipes)
    .where(and(eq(recipes.companyId, companyId), inArray(recipes.productItemId, kitIds)));
  if (!recipeRows.length) return new Map();

  const recipeIds = recipeRows.map((row) => row.id);
  const activeVersions = await db
    .select({ id: recipeVersions.id, recipeId: recipeVersions.recipeId, yieldQty: recipeVersions.yieldQty })
    .from(recipeVersions)
    .where(and(inArray(recipeVersions.recipeId, recipeIds), eq(recipeVersions.status, "ativa")));
  if (!activeVersions.length) return new Map();

  const versionIds = activeVersions.map((row) => row.id);
  const components = await db
    .select({
      recipeVersionId: recipeComponents.recipeVersionId,
      itemId: recipeComponents.itemId,
      sku: recipeComponents.sku,
      quantity: recipeComponents.quantity,
    })
    .from(recipeComponents)
    .where(inArray(recipeComponents.recipeVersionId, versionIds));

  const productByRecipe = new Map(recipeRows.map((row) => [row.id, row.productItemId]));
  const yieldByVersion = new Map(activeVersions.map((row) => [row.id, toNumber(row.yieldQty, 1) || 1]));
  const recipeByVersion = new Map(activeVersions.map((row) => [row.id, row.recipeId]));

  const result = new Map<string, KitComponent[]>();
  for (const component of components) {
    if (!component.itemId) continue;
    const recipeId = recipeByVersion.get(component.recipeVersionId);
    const kitItemId = recipeId ? productByRecipe.get(recipeId) : null;
    if (!kitItemId) continue;
    const perKit = toNumber(component.quantity) / (yieldByVersion.get(component.recipeVersionId) ?? 1);
    if (perKit <= 0) continue;
    const list = result.get(kitItemId) ?? [];
    list.push({ itemId: component.itemId, sku: component.sku, perKit: Math.round(perKit * 1000) / 1000 });
    result.set(kitItemId, list);
  }
  return result;
}
