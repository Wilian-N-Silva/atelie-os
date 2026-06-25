import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { companyBrandSettings } from "@/db/schema";
import { ACTIVE_COMPANY_COOKIE, getActiveCompanyForUser, requireAuthenticatedUser } from "@/lib/app-route-context";
import { publicAppConfig } from "@/lib/deployment";
import type { BrandTheme } from "@/lib/theme";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

  const membership = await getActiveCompanyForUser(authResult.user.id, request);
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
    company: membership?.company ?? null,
    companyName: membership?.company.name ?? null,
    companyBranding: membership
      ? {
          logoUrl: branding?.logoUrl ?? null,
          themeTokens: (branding?.themeTokens as BrandTheme | undefined) ?? null,
        }
      : null,
    onboarded: Boolean(membership),
    deployment: publicAppConfig(),
  };

  const res = NextResponse.json(payload);
  if (membership) {
    res.cookies.set(ACTIVE_COMPANY_COOKIE, membership.company.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
