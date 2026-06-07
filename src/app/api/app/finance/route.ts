import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditLogs, financeEntries, user } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { INVENTORY_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanMoney(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? Math.round(number * 100) / 100 : 0;
}

async function listFinance(companyId: string) {
  const rows = await db
    .select({
      id: financeEntries.id,
      type: financeEntries.type,
      status: financeEntries.status,
      description: financeEntries.description,
      amount: financeEntries.amount,
      dueAt: financeEntries.dueAt,
      paidAt: financeEntries.paidAt,
      sourceType: financeEntries.sourceType,
      sourceId: financeEntries.sourceId,
      createdAt: financeEntries.createdAt,
      actorName: user.name,
    })
    .from(financeEntries)
    .leftJoin(user, eq(financeEntries.createdByUserId, user.id))
    .where(eq(financeEntries.companyId, companyId))
    .orderBy(desc(financeEntries.createdAt))
    .limit(120);

  return rows.map((row) => ({
    ...row,
    amount: Number(row.amount),
    createdAt: row.createdAt.toISOString(),
  }));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json({ entries: await listFinance(contextResult.context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, INVENTORY_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const type = cleanString(body?.type, 20);
  const status = cleanString(body?.status, 20) || "pending";
  const description = cleanString(body?.description, 160);
  const amount = cleanMoney(body?.amount);
  if (!["income", "expense"].includes(type) || !description || amount <= 0) {
    return NextResponse.json({ error: "invalid_finance_entry" }, { status: 400 });
  }

  await db.transaction(async (tx) => {
    const [entry] = await tx.insert(financeEntries).values({
      companyId: context.company.id,
      type,
      status,
      description,
      amount: amount.toString(),
      dueAt: cleanString(body?.dueAt, 40) || null,
      paidAt: cleanString(body?.paidAt, 40) || null,
      sourceType: "manual",
      createdByUserId: context.user.id,
    }).returning({ id: financeEntries.id });

    await tx.insert(auditLogs).values({
      companyId: context.company.id,
      actorUserId: context.user.id,
      action: "finance.create",
      entityType: "finance_entry",
      entityId: entry.id,
      metadata: { type, status, amount, description },
    });
  });

  return NextResponse.json({ entries: await listFinance(context.company.id) }, { status: 201 });
}
