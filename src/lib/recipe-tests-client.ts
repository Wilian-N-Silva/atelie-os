"use client";

import type { RecipeTest, RecipeTestCriterion } from "@/lib/domain";

async function parseTestsResponse(res: Response) {
  if (!res.ok) throw new Error("recipe_tests_request_failed");
  const payload = await res.json() as { tests?: RecipeTest[] };
  return payload.tests ?? [];
}

export async function loadRecipeTests() {
  const res = await fetch("/api/app/recipe-tests", {
    cache: "no-store",
    credentials: "include",
  });
  return parseTestsResponse(res);
}

export async function createRecipeTest(recipeVersionId: string, batchQty = 1) {
  const res = await fetch("/api/app/recipe-tests", {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ recipeVersionId, batchQty }),
  });
  return parseTestsResponse(res);
}

export async function submitRecipeTest(testId: string, criteria: RecipeTestCriterion[], note: string) {
  const res = await fetch("/api/app/recipe-tests", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      testId,
      note,
      criteria: criteria.map((criterion) => ({ key: criterion.key, result: criterion.result, note: criterion.note })),
    }),
  });
  return parseTestsResponse(res);
}
