import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { companies, companyMembers, type MemberRole } from "@/db/schema";
import { auth } from "@/lib/auth";

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

export async function getActiveCompanyForUser(userId: string) {
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
        eq(companyMembers.status, "active"),
        eq(companies.status, "active"),
      ),
    )
    .limit(1);

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

  const activeCompany = await getActiveCompanyForUser(authResult.user.id);

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
