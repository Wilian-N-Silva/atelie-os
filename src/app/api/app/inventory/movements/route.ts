import { NextResponse } from "next/server";
import { requireAppRole, requireAppRouteContext } from "@/lib/app-route-context";
import { createInventoryMovement } from "@/lib/inventory-server";
import { parseInventoryMovementInput } from "@/lib/inventory-validation";
import { INVENTORY_WRITE_ROLES } from "@/lib/permissions";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const roleError = requireAppRole(context, INVENTORY_WRITE_ROLES);
  if (roleError) return roleError;

  const parsed = parseInventoryMovementInput(await request.json().catch(() => null));
  if ("error" in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const result = await createInventoryMovement(context, parsed.input);
  if ("error" in result) {
    const { error } = result;
    const status = error === "item_not_found" ||
      error === "from_location_not_found" ||
      error === "to_location_not_found"
      ? 404
      : error.startsWith("insufficient_")
        ? 409
        : 400;

    return NextResponse.json({ error }, { status });
  }

  return NextResponse.json(result, { status: 201 });
}
