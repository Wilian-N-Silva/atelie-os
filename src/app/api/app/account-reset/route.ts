import { NextResponse } from "next/server";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { hardResetCompanyData } from "@/lib/company-reset";

export const runtime = "nodejs";

const CONFIRMATION = "RESETAR";

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const roleError = requireAppRole(contextResult.context, ["owner"]);
  if (roleError) return roleError;

  const body = await request.json().catch(() => null) as { confirmation?: unknown } | null;
  if (body?.confirmation !== CONFIRMATION) {
    return NextResponse.json({ error: "invalid_confirmation" }, { status: 400 });
  }

  await hardResetCompanyData(contextResult.context.company.id, contextResult.context.user.id);

  return NextResponse.json({ ok: true });
}
