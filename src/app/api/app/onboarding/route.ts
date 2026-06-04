import { NextResponse } from "next/server";
import { createCompanyForUser } from "@/db/bootstrap";
import { requireAuthenticatedUser } from "@/lib/app-route-context";
import type { OnboardingInvite } from "@/lib/seed-defaults";

export const runtime = "nodejs";

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

  return NextResponse.json({ companyName: company.companyName });
}
