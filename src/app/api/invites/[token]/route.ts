import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs, companies, companyBrandSettings, companyMembers, pendingInvites } from "@/db/schema";
import { ACTIVE_COMPANY_COOKIE, requireAuthenticatedUser } from "@/lib/app-route-context";
import { publicAppConfig } from "@/lib/deployment";
import { hashInviteToken } from "@/lib/invite-tokens";
import type { BrandTheme } from "@/lib/theme";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

type Params = { params: Promise<{ token: string }> };

async function loadInvite(token: string) {
  const tokenHash = hashInviteToken(token);
  const [invite] = await db
    .select({
      id: pendingInvites.id,
      email: pendingInvites.email,
      role: pendingInvites.role,
      status: pendingInvites.status,
      expiresAt: pendingInvites.expiresAt,
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(pendingInvites)
    .innerJoin(companies, eq(pendingInvites.companyId, companies.id))
    .where(eq(pendingInvites.tokenHash, tokenHash))
    .limit(1);

  if (!invite || invite.status !== "invited") return null;
  if (invite.expiresAt && invite.expiresAt < new Date()) return null;
  return invite;
}

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const invite = await loadInvite(token);
  if (!invite) return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  return NextResponse.json({
    email: invite.email,
    role: invite.role,
    company: {
      name: invite.companyName,
      slug: invite.companySlug,
    },
  });
}

export async function POST(request: Request, { params }: Params) {
  const { token } = await params;
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

  const invite = await loadInvite(token);
  if (!invite) return NextResponse.json({ error: "invite_not_found" }, { status: 404 });
  if (authResult.user.email.toLowerCase() !== invite.email.toLowerCase()) {
    return NextResponse.json({ error: "invite_email_mismatch" }, { status: 403 });
  }

  await db
    .insert(companyMembers)
    .values({
      companyId: invite.companyId,
      userId: authResult.user.id,
      role: invite.role,
      status: "active",
    })
    .onConflictDoUpdate({
      target: [companyMembers.companyId, companyMembers.userId],
      set: { role: invite.role, status: "active", updatedAt: new Date() },
    });

  await db
    .update(pendingInvites)
    .set({ status: "active", tokenHash: null, updatedAt: new Date() })
    .where(eq(pendingInvites.id, invite.id));

  await db.insert(auditLogs).values({
    companyId: invite.companyId,
    actorUserId: authResult.user.id,
    action: "member.invite",
    entityType: "pending_invite",
    entityId: invite.email,
    metadata: { accepted: true, role: invite.role },
  });

  const branding = await db.query.companyBrandSettings.findFirst({
    where: eq(companyBrandSettings.companyId, invite.companyId),
    columns: { logoUrl: true, themeTokens: true },
  });

  const payload: Session = {
    user: {
      name: authResult.user.name,
      email: authResult.user.email,
      role: invite.role,
    },
    company: {
      id: invite.companyId,
      name: invite.companyName,
      slug: invite.companySlug,
    },
    companyName: invite.companyName,
    companyBranding: {
      logoUrl: branding?.logoUrl ?? null,
      themeTokens: (branding?.themeTokens as BrandTheme | undefined) ?? null,
    },
    onboarded: true,
    deployment: publicAppConfig(),
  };

  const res = NextResponse.json(payload);
  res.cookies.set(ACTIVE_COMPANY_COOKIE, invite.companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
