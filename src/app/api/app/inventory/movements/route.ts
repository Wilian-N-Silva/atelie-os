import { NextResponse } from "next/server";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { createInventoryMovement, parseInventoryMovementInput } from "@/lib/inventory-server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
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
