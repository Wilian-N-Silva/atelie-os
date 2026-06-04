import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companyBrandSettings } from "@/db/schema";
import { getActiveCompanyForUser, requireAuthenticatedUser } from "@/lib/app-route-context";
import type { BrandTheme } from "@/lib/theme";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

  const membership = await getActiveCompanyForUser(authResult.user.id);
  const branding = membership
    ? await db.query.companyBrandSettings.findFirst({
        where: eq(companyBrandSettings.companyId, membership.company.id),
        columns: { logoUrl: true, themeTokens: true },
      })
    : null;

  const payload: Session = {
    user: {
      name: authResult.user.name,
      email: authResult.user.email,
      role: membership?.role ?? "owner",
    },
    companyName: membership?.company.name ?? null,
    companyBranding: membership
      ? {
          logoUrl: branding?.logoUrl ?? null,
          themeTokens: (branding?.themeTokens as BrandTheme | undefined) ?? null,
        }
      : null,
    onboarded: Boolean(membership),
  };

  return NextResponse.json(payload);
}
