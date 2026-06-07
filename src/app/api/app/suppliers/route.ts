import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, suppliers } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { CATALOG_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

async function listSuppliers(companyId: string) {
  const rows = await db.query.suppliers.findMany({
    where: eq(suppliers.companyId, companyId),
    orderBy: (table, { asc }) => [asc(table.name)],
  });
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    document: row.document,
    email: row.email,
    phone: row.phone,
    notes: row.notes,
    status: row.status,
  }));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ suppliers: await listSuppliers(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, CATALOG_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const name = cleanString(body?.name, 120);
  if (!name) return NextResponse.json({ error: "invalid_supplier" }, { status: 400 });

  await db.transaction(async (tx) => {
    const [supplier] = await tx.insert(suppliers).values({
      companyId: context.company.id,
      name,
      document: cleanString(body?.document, 40) || null,
      email: cleanString(body?.email, 120) || null,
      phone: cleanString(body?.phone, 40) || null,
      notes: cleanString(body?.notes, 500) || null,
    }).returning({ id: suppliers.id });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "supplier.create",
      entityType: "supplier",
      entityId: supplier.id,
      metadata: { name },
    });
  });

  return NextResponse.json({ suppliers: await listSuppliers(context.company.id) }, { status: 201 });
}
