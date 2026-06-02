import { NextResponse } from "next/server";
import { createCompanyForUser } from "@/db/bootstrap";
import { requireAuthenticatedUser } from "@/lib/app-route-context";
import type { OnboardingInvite } from "@/lib/seed-defaults";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

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
    userId: authResult.user.id,
    companyName,
    segment: body?.segment ?? null,
    teamSize: body?.teamSize ?? null,
    invites: body?.invites ?? [],
  });

  return NextResponse.json({ companyName: company.companyName });
}
