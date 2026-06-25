import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { companyMembers, companies } from "@/db/schema";
import { db } from "@/db/client";
import { createCompanyForUser } from "@/db/bootstrap";
import { ACTIVE_COMPANY_COOKIE, requireAuthenticatedUser } from "@/lib/app-route-context";
import { publicAppConfig } from "@/lib/deployment";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

  const existingCompany = await db.query.companies.findFirst({
    where: eq(companies.slug, "atelie-de-exemplo"),
    columns: { id: true, name: true, slug: true },
  });

  const company = existingCompany ?? (await createCompanyForUser({
    userId: authResult.user.id,
    companyName: "Atelie de exemplo",
    segment: "velas",
    teamSize: "small",
  }).then((created) => ({ id: created.companyId, name: created.companyName, slug: created.companySlug })));

  if (!company) {
    return NextResponse.json({ error: "company_not_found" }, { status: 500 });
  }

  await db
    .insert(companyMembers)
    .values({
      companyId: company.id,
      userId: authResult.user.id,
      role: "operator",
      status: "active",
    })
    .onConflictDoNothing();

  const [membership] = await db
    .select({ role: companyMembers.role })
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, company.id), eq(companyMembers.userId, authResult.user.id)))
    .limit(1);

  const res = NextResponse.json({
    user: {
      name: authResult.user.name,
      email: authResult.user.email,
      role: membership?.role ?? "operator",
    },
    company: {
      id: company.id,
      name: company.name,
      slug: company.slug,
    },
    companyName: company.name,
    companyBranding: null,
    onboarded: true,
    deployment: publicAppConfig(),
  });
  res.cookies.set(ACTIVE_COMPANY_COOKIE, company.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
