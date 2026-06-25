import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { companies, companyMembers, type MemberRole } from "@/db/schema";
import { auth } from "@/lib/auth";
import { standaloneCompanySlug } from "@/lib/deployment";

export const ACTIVE_COMPANY_COOKIE = "atelie_active_company_id";

export type AuthenticatedUser = {
  id: string;
  name: string;
  email: string;
};

export type ActiveCompany = {
  id: string;
  name: string;
  slug: string;
};

export type AppRouteContext = {
  user: AuthenticatedUser;
  company: ActiveCompany;
  role: MemberRole;
};

type AuthenticatedUserResult =
  | { user: AuthenticatedUser }
  | { response: NextResponse };

type AppRouteContextResult =
  | { context: AppRouteContext }
  | { response: NextResponse };

export function appRouteError(error: "unauthorized" | "forbidden", status: 401 | 403) {
  return NextResponse.json({ error }, { status });
}

export function requireAppRole(context: AppRouteContext, allowedRoles: readonly MemberRole[]) {
  if (allowedRoles.includes(context.role)) return null;
  return appRouteError("forbidden", 403);
}

export async function requireAuthenticatedUser(request: Request): Promise<AuthenticatedUserResult> {
  const session = await auth.api.getSession({
    headers: request.headers,
  });

  if (!session) {
    return { response: appRouteError("unauthorized", 401) };
  }

  return {
    user: {
      id: session.user.id,
      name: session.user.name,
      email: session.user.email,
    },
  };
}

function cookieValue(request: Request | null | undefined, name: string) {
  const cookie = request?.headers.get("cookie") ?? "";
  const found = cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

async function membershipForCompany(userId: string, companyId: string) {
  const [membership] = await db
    .select({
      role: companyMembers.role,
      companyId: companies.id,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(
      and(
        eq(companyMembers.userId, userId),
        eq(companies.id, companyId),
        eq(companyMembers.status, "active"),
        eq(companies.status, "active"),
      ),
    )
    .limit(1);
  return membership ?? null;
}

export async function getActiveCompanyForUser(userId: string, request?: Request) {
  const requestedCompanyId = cookieValue(request, ACTIVE_COMPANY_COOKIE);
  const standaloneSlug = standaloneCompanySlug();

  let membership = requestedCompanyId ? await membershipForCompany(userId, requestedCompanyId) : null;

  if (!membership && standaloneSlug) {
    const [standalone] = await db
      .select({
        role: companyMembers.role,
        companyId: companies.id,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(
        and(
          eq(companyMembers.userId, userId),
          eq(companyMembers.status, "active"),
          eq(companies.status, "active"),
          eq(companies.slug, standaloneSlug),
        ),
      )
      .limit(1);
    membership = standalone ?? null;
  }

  if (!membership) {
    const [fallback] = await db
      .select({
        role: companyMembers.role,
        companyId: companies.id,
        companyName: companies.name,
        companySlug: companies.slug,
      })
      .from(companyMembers)
      .innerJoin(companies, eq(companyMembers.companyId, companies.id))
      .where(
        and(
          eq(companyMembers.userId, userId),
          eq(companyMembers.status, "active"),
          eq(companies.status, "active"),
        ),
      )
      .limit(1);
    membership = fallback ?? null;
  }

  if (!membership) return null;

  return {
    role: membership.role,
    company: {
      id: membership.companyId,
      name: membership.companyName,
      slug: membership.companySlug,
    },
  };
}

export async function requireAppRouteContext(request: Request): Promise<AppRouteContextResult> {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult;

  const activeCompany = await getActiveCompanyForUser(authResult.user.id, request);

  if (!activeCompany) {
    return { response: appRouteError("forbidden", 403) };
  }

  return {
    context: {
      user: authResult.user,
      company: activeCompany.company,
      role: activeCompany.role,
    },
  };
}
