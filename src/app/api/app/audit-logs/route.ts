import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db/client";
import { auditActionEnum, auditLogs, user } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";

export const runtime = "nodejs";

const ACTIONS = auditActionEnum.enumValues;

function cleanString(value: string | null, max: number) {
  return value?.trim().slice(0, max) ?? "";
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const roleError = requireAppRole(contextResult.context, ["owner", "admin"]);
  if (roleError) return roleError;

  const url = new URL(request.url);
  const action = cleanString(url.searchParams.get("action"), 80);
  const entityType = cleanString(url.searchParams.get("entityType"), 80);
  const actorUserId = cleanString(url.searchParams.get("actorUserId"), 120);

  const filters = [eq(auditLogs.companyId, contextResult.context.company.id)];
  if (ACTIONS.includes(action as typeof ACTIONS[number])) filters.push(eq(auditLogs.action, action as typeof ACTIONS[number]));
  if (entityType) filters.push(eq(auditLogs.entityType, entityType));
  if (actorUserId) filters.push(eq(auditLogs.actorUserId, actorUserId));

  const rows = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      entityType: auditLogs.entityType,
      entityId: auditLogs.entityId,
      metadata: auditLogs.metadata,
      createdAt: auditLogs.createdAt,
      actorUserId: auditLogs.actorUserId,
      actorName: user.name,
      actorEmail: user.email,
    })
    .from(auditLogs)
    .leftJoin(user, eq(auditLogs.actorUserId, user.id))
    .where(and(...filters))
    .orderBy(desc(auditLogs.createdAt))
    .limit(100);

  return NextResponse.json({
    logs: rows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
