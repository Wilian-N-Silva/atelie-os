"use client";

import type { Recipe } from "@/lib/domain";

export type RecipeInput = Pick<
  Recipe,
  "name" | "product" | "productName" | "yield" | "yieldUnit" | "cureDays" | "components" | "tests"
>;

async function parseRecipesResponse(res: Response) {
  if (!res.ok) throw new Error("recipes_request_failed");
  const payload = await res.json() as { recipes?: Recipe[] };
  return payload.recipes ?? [];
}

export async function loadRecipes() {
  const res = await fetch("/api/app/recipes", {
    cache: "no-store",
    credentials: "include",
  });
  return parseRecipesResponse(res);
}

export async function createRecipe(recipe: RecipeInput) {
  const res = await fetch("/api/app/recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mode: "create", recipe }),
  });
  return parseRecipesResponse(res);
}

export async function createRecipeVersion(baseVersionId: string, recipe: RecipeInput) {
  const res = await fetch("/api/app/recipes", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ mode: "version", baseVersionId, recipe }),
  });
  return parseRecipesResponse(res);
}
