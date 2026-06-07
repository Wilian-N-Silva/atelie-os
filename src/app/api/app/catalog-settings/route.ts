import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { categories, items, units } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

// Canonical measurement codes are protected so unit math stays sane (g/kg/ml/l/un).
const PROTECTED_UNIT_CODES = new Set(["g", "kg", "mg", "ml", "l", "un", "und", "pc"]);

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function usage(companyId: string) {
  const rows = await db
    .select({ baseUnitId: items.baseUnitId, categoryId: items.categoryId })
    .from(items)
    .where(eq(items.companyId, companyId));
  const usedUnits = new Set<string>();
  const usedCategories = new Set<string>();
  for (const row of rows) {
    if (row.baseUnitId) usedUnits.add(row.baseUnitId);
    if (row.categoryId) usedCategories.add(row.categoryId);
  }
  return { usedUnits, usedCategories };
}

async function catalogPayload(companyId: string) {
  const [unitRows, categoryRows, used] = await Promise.all([
    db.select().from(units).where(eq(units.companyId, companyId)).orderBy(units.code),
    db.select().from(categories).where(eq(categories.companyId, companyId)).orderBy(categories.name),
    usage(companyId),
  ]);
  return {
    units: unitRows.map((u) => ({ id: u.id, code: u.code, name: u.name, kind: u.kind, inUse: used.usedUnits.has(u.id), protected: PROTECTED_UNIT_CODES.has(u.code.toLowerCase()) })),
    categories: categoryRows.map((c) => ({ id: c.id, name: c.name, kind: c.kind, inUse: used.usedCategories.has(c.id) })),
  };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json(await catalogPayload(contextResult.context.company.id));
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resource = body?.resource;
  const name = cleanString(body?.name, 80);
  const kind = cleanString(body?.kind, 40) || (resource === "unit" ? "unit" : "product");
  if (!name) return NextResponse.json({ error: "invalid_name" }, { status: 400 });

  try {
    if (resource === "unit") {
      const code = cleanString(body?.code, 16).toLowerCase();
      if (!code) return NextResponse.json({ error: "invalid_code" }, { status: 400 });
      await db.insert(units).values({ companyId: context.company.id, code, name, kind });
    } else if (resource === "category") {
      await db.insert(categories).values({ companyId: context.company.id, name, kind });
    } else {
      return NextResponse.json({ error: "invalid_resource" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "duplicate" }, { status: 409 });
  }

  return NextResponse.json(await catalogPayload(context.company.id), { status: 201 });
}

export async function PATCH(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const resource = body?.resource;
  const id = cleanString(body?.id, 80);
  const name = cleanString(body?.name, 80);
  if (!id || !name) return NextResponse.json({ error: "invalid_patch" }, { status: 400 });

  // Only the display name is editable; the technical key (unit code / category id) stays stable.
  if (resource === "unit") {
    await db.update(units).set({ name, updatedAt: new Date() }).where(and(eq(units.companyId, context.company.id), eq(units.id, id)));
  } else if (resource === "category") {
    await db.update(categories).set({ name, updatedAt: new Date() }).where(and(eq(categories.companyId, context.company.id), eq(categories.id, id)));
  } else {
    return NextResponse.json({ error: "invalid_resource" }, { status: 400 });
  }

  return NextResponse.json(await catalogPayload(context.company.id));
}

export async function DELETE(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const url = new URL(request.url);
  const resource = url.searchParams.get("resource");
  const id = cleanString(url.searchParams.get("id"), 80);
  if (!id) return NextResponse.json({ error: "invalid_delete" }, { status: 400 });

  const used = await usage(context.company.id);

  if (resource === "unit") {
    const [unit] = await db.select().from(units).where(and(eq(units.companyId, context.company.id), eq(units.id, id))).limit(1);
    if (!unit) return NextResponse.json({ error: "not_found" }, { status: 404 });
    if (used.usedUnits.has(id)) return NextResponse.json({ error: "unit_in_use" }, { status: 409 });
    if (PROTECTED_UNIT_CODES.has(unit.code.toLowerCase())) return NextResponse.json({ error: "unit_protected" }, { status: 409 });
    await db.delete(units).where(and(eq(units.companyId, context.company.id), eq(units.id, id)));
  } else if (resource === "category") {
    if (used.usedCategories.has(id)) return NextResponse.json({ error: "category_in_use" }, { status: 409 });
    await db.delete(categories).where(and(eq(categories.companyId, context.company.id), eq(categories.id, id)));
  } else {
    return NextResponse.json({ error: "invalid_resource" }, { status: 400 });
  }

  return NextResponse.json(await catalogPayload(context.company.id));
}
