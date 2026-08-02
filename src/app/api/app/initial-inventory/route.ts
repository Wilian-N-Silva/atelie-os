import { NextResponse } from "next/server";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { applyInitialInventory, parseInitialInventoryPayload } from "@/lib/initial-inventory";
import { INVENTORY_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const roleError = requireAppRole(contextResult.context, INVENTORY_WRITE_ROLES);
  if (roleError) return roleError;

  const parsed = parseInitialInventoryPayload(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await applyInitialInventory(contextResult.context, parsed.input);
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400 });

  return NextResponse.json(result, { status: 201 });
}
