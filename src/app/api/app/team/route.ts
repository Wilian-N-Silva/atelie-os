import { and, desc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs, companyMembers, pendingInvites, user, type MemberRole } from "@/db/schema";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { sendTeamInviteEmail } from "@/lib/email-server";
import { createInviteToken } from "@/lib/invite-tokens";
import { SETTINGS_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

function cleanEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase().slice(0, 160) : "";
}

function cleanRole(value: unknown): MemberRole {
  return value === "admin" ? "admin" : "operator";
}

async function teamPayload(companyId: string) {
  const [members, invites] = await Promise.all([
    db
      .select({
        id: companyMembers.id,
        name: user.name,
        email: user.email,
        role: companyMembers.role,
        status: companyMembers.status,
        createdAt: companyMembers.createdAt,
      })
      .from(companyMembers)
      .innerJoin(user, eq(companyMembers.userId, user.id))
      .where(eq(companyMembers.companyId, companyId))
      .orderBy(desc(companyMembers.createdAt)),
    db
      .select({
        id: pendingInvites.id,
        email: pendingInvites.email,
        role: pendingInvites.role,
        status: pendingInvites.status,
        createdAt: pendingInvites.createdAt,
      })
      .from(pendingInvites)
      .where(and(eq(pendingInvites.companyId, companyId), eq(pendingInvites.status, "invited")))
      .orderBy(desc(pendingInvites.createdAt)),
  ]);

  return { members, invites };
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;
  return NextResponse.json(await teamPayload(contextResult.context.company.id));
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, SETTINGS_WRITE_ROLES);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as { email?: unknown; role?: unknown } | null;
  const email = cleanEmail(body?.email);
  const role = cleanRole(body?.role);
  const inviteToken = createInviteToken();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "invalid_email" }, { status: 400 });
  }

  await db
    .insert(pendingInvites)
    .values({
      companyId: context.company.id,
      email,
      role,
      tokenHash: inviteToken.tokenHash,
      expiresAt: inviteToken.expiresAt,
      invitedByUserId: context.user.id,
    })
    .onConflictDoUpdate({
      target: [pendingInvites.companyId, pendingInvites.email],
      set: { role, status: "invited", tokenHash: inviteToken.tokenHash, expiresAt: inviteToken.expiresAt, invitedByUserId: context.user.id, updatedAt: new Date() },
    });

  await db.insert(auditLogs).values({
    companyId: context.company.id,
    actorUserId: context.user.id,
    action: "member.invite",
    entityType: "pending_invite",
    entityId: email,
    metadata: { role },
  });

  await sendTeamInviteEmail({
    to: email,
    companyName: context.company.name,
    role,
    invitedBy: context.user.name,
    token: inviteToken.token,
  }).catch((error) => {
    console.warn("[email:invite_failed]", email, error);
  });

  return NextResponse.json(await teamPayload(context.company.id), { status: 201 });
}
