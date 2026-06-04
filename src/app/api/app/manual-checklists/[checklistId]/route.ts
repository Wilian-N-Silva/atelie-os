import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { helpChecklistItems, helpChecklists } from "@/db/schema";
import { requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

function normalizeChecklistId(value: string) {
  const id = value.trim().toLowerCase();
  return /^[a-z0-9-]{1,80}$/.test(id) ? id : null;
}

function normalizeCompleted(value: unknown) {
  if (!Array.isArray(value)) return null;
  const completed = value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item < 500);
  return Array.from(new Set(completed));
}

function normalizeLabels(value: unknown) {
  if (!Array.isArray(value)) return null;
  const labels = value.map((item) => String(item ?? "").trim()).filter(Boolean);
  return labels.length ? labels.slice(0, 500) : null;
}

async function findChecklist(companyId: string, checklistId: string) {
  return db.query.helpChecklists.findFirst({
    where: and(
      eq(helpChecklists.companyId, companyId),
      eq(helpChecklists.technicalKey, `manual.${checklistId}`),
    ),
    columns: { id: true },
  });
}

async function ensureChecklist(companyId: string, checklistId: string, labels: string[]) {
  const existing = await findChecklist(companyId, checklistId);
  const checklist = existing ?? (await db
    .insert(helpChecklists)
    .values({
      companyId,
      technicalKey: `manual.${checklistId}`,
      title: `Manual - ${checklistId}`,
    })
    .returning({ id: helpChecklists.id }))[0];

  if (!checklist) throw new Error("Checklist was not created.");

  await db
    .insert(helpChecklistItems)
    .values(labels.map((label, index) => ({
      checklistId: checklist.id,
      technicalKey: String(index),
      label,
      position: index + 1,
    })))
    .onConflictDoNothing();

  return checklist;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ checklistId: string }> },
) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { checklistId: rawChecklistId } = await params;
  const checklistId = normalizeChecklistId(rawChecklistId);
  if (!checklistId) return NextResponse.json({ error: "invalid_checklist_id" }, { status: 400 });

  const checklist = await findChecklist(contextResult.context.company.id, checklistId);
  if (!checklist) return NextResponse.json({ completed: [] });

  const items = await db.query.helpChecklistItems.findMany({
    where: eq(helpChecklistItems.checklistId, checklist.id),
    columns: { technicalKey: true, completedAt: true },
  });

  return NextResponse.json({
    completed: items
      .filter((item) => item.completedAt)
      .map((item) => Number(item.technicalKey))
      .filter((item) => Number.isInteger(item)),
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ checklistId: string }> },
) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { checklistId: rawChecklistId } = await params;
  const checklistId = normalizeChecklistId(rawChecklistId);
  if (!checklistId) return NextResponse.json({ error: "invalid_checklist_id" }, { status: 400 });

  const body = await request.json().catch(() => null) as {
    completed?: unknown;
    labels?: unknown;
  } | null;
  const completed = normalizeCompleted(body?.completed);
  const labels = normalizeLabels(body?.labels);
  if (!completed || !labels) return NextResponse.json({ error: "invalid_checklist" }, { status: 400 });

  const checklist = await ensureChecklist(contextResult.context.company.id, checklistId, labels);
  const completedSet = new Set(completed.map(String));
  const rows = await db.query.helpChecklistItems.findMany({
    where: eq(helpChecklistItems.checklistId, checklist.id),
    columns: { id: true, technicalKey: true },
  });

  await Promise.all(rows.map((row) => db
    .update(helpChecklistItems)
    .set({ completedAt: completedSet.has(row.technicalKey) ? new Date() : null, updatedAt: new Date() })
    .where(eq(helpChecklistItems.id, row.id))));

  return NextResponse.json({ completed });
}
