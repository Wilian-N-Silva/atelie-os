import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { createCompanyForUser } from "@/db/bootstrap";
import { companies } from "@/db/schema";
import { ACTIVE_COMPANY_COOKIE, requireAuthenticatedUser } from "@/lib/app-route-context";
import { isOwnerEmail, isStandaloneDeployment, ownerEmail } from "@/lib/deployment";
import type { OnboardingInvite } from "@/lib/seed-defaults";

export const runtime = "nodejs";

async function canRunStandaloneOwnerOnboarding(email: string) {
  if (!isStandaloneDeployment()) return true;
  const firstCompany = await db.select({ id: companies.id }).from(companies).limit(1);
  if (firstCompany.length > 0) return false;
  const configuredOwner = ownerEmail();
  return configuredOwner ? isOwnerEmail(email) : true;
}

function parseLogoUrl(value: unknown) {
  if (value == null || value === "") return null;
  if (typeof value !== "string") return null;

  const logo = value.trim();
  if (logo.length > 1_500_000) return null;
  if (/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/i.test(logo)) return logo;
  if (/^https:\/\/.+/i.test(logo)) return logo;
  return null;
}

export async function POST(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

  if (!(await canRunStandaloneOwnerOnboarding(authResult.user.email))) {
    return NextResponse.json({ error: "onboarding_disabled" }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    companyName?: string;
    segment?: string;
    teamSize?: string;
    logoUrl?: string | null;
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
    logoUrl: parseLogoUrl(body?.logoUrl),
    invites: body?.invites ?? [],
  });

  const res = NextResponse.json({ companyName: company.companyName, companyId: company.companyId });
  res.cookies.set(ACTIVE_COMPANY_COOKIE, company.companyId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
