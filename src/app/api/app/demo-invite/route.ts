import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { companyMembers, companies } from "@/db/schema";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import { createCompanyForUser } from "@/db/bootstrap";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authSession = await auth.api.getSession({
    headers: request.headers,
  });

  if (!authSession) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const existingCompany = await db.query.companies.findFirst({
    where: eq(companies.slug, "instante-ambar"),
    columns: { id: true, name: true },
  });

  const company = existingCompany ?? await createCompanyForUser({
      userId: authSession.user.id,
      companyName: "Instante Ambar",
      segment: "velas",
      teamSize: "small",
    }).then((created) => ({ id: created.companyId, name: created.companyName }));

  if (!company) {
    return NextResponse.json({ error: "company_not_found" }, { status: 500 });
  }

  await db
    .insert(companyMembers)
    .values({
      companyId: company.id,
      userId: authSession.user.id,
      role: "operator",
      status: "active",
    })
    .onConflictDoNothing();

  const [membership] = await db
    .select({ role: companyMembers.role })
    .from(companyMembers)
    .where(and(eq(companyMembers.companyId, company.id), eq(companyMembers.userId, authSession.user.id)))
    .limit(1);

  return NextResponse.json({
    user: {
      name: authSession.user.name,
      email: authSession.user.email,
      role: membership?.role ?? "operator",
    },
    companyName: company.name,
    onboarded: true,
  });
}
