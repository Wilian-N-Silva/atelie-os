import { NextResponse } from "next/server";
import { getActiveCompanyForUser, requireAuthenticatedUser } from "@/lib/app-route-context";
import type { Session } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const authResult = await requireAuthenticatedUser(request);
  if ("response" in authResult) return authResult.response;

  const membership = await getActiveCompanyForUser(authResult.user.id);

  const payload: Session = {
    user: {
      name: authResult.user.name,
      email: authResult.user.email,
      role: membership?.role ?? "owner",
    },
    companyName: membership?.company.name ?? null,
    onboarded: Boolean(membership),
  };

  return NextResponse.json(payload);
}
