import { NextResponse } from "next/server";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { buildInventoryResponse } from "@/lib/inventory-server";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const url = new URL(request.url);
  const locationId = url.searchParams.get("locationId");

  return NextResponse.json(await buildInventoryResponse(context.company, { locationId }));
}
