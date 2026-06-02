import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCompanyForUser } from "@/db/bootstrap";
import type { OnboardingInvite } from "@/lib/seed-defaults";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authSession = await auth.api.getSession({
    headers: request.headers,
  });

  if (!authSession) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    companyName?: string;
    segment?: string;
    teamSize?: string;
    invites?: OnboardingInvite[];
  } | null;

  const companyName = body?.companyName?.trim();

  if (!companyName) {
    return NextResponse.json({ error: "companyName is required" }, { status: 400 });
  }

  const company = await createCompanyForUser({
    userId: authSession.user.id,
    companyName,
    segment: body?.segment ?? null,
    teamSize: body?.teamSize ?? null,
    invites: body?.invites ?? [],
  });

  return NextResponse.json({ companyName: company.companyName });
}
