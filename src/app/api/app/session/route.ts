import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { companyMembers, companies } from "@/db/schema";
import { db } from "@/db/client";
import { auth } from "@/lib/auth";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authSession = await auth.api.getSession({
    headers: request.headers,
  });

  if (!authSession) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [membership] = await db
    .select({
      role: companyMembers.role,
      companyName: companies.name,
    })
    .from(companyMembers)
    .innerJoin(companies, eq(companyMembers.companyId, companies.id))
    .where(and(eq(companyMembers.userId, authSession.user.id), eq(companyMembers.status, "active")))
    .limit(1);

  const payload: Session = {
    user: {
      name: authSession.user.name,
      email: authSession.user.email,
      role: membership?.role ?? "owner",
    },
    companyName: membership?.companyName ?? null,
    onboarded: Boolean(membership),
  };

  return NextResponse.json(payload);
}
