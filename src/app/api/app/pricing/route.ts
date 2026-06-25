import { NextResponse } from "next/server";
import { requireAppRouteContext } from "@/lib/app-route-context";
import { listPriceHistory, listPricing, savePricing, savePricingSettings, type PricingSettings } from "@/lib/pricing-server";

export const runtime = "nodejs";

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanNumber(value: unknown, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

export async function GET(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const itemId = cleanString(new URL(request.url).searchParams.get("itemId"), 80);
  if (itemId) {
    return NextResponse.json({ history: await listPriceHistory(context.company.id, itemId) });
  }
  return NextResponse.json({ products: await listPricing(context.company.id) });
}

export async function POST(request: Request) {
  const contextResult = await requireAppRouteContext(request);
  if ("response" in contextResult) return contextResult.response;

  const { context } = contextResult;
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (body?.mode === "settings") {
    await savePricingSettings(context.company.id, body.settings as PricingSettings);
    return NextResponse.json({ products: await listPricing(context.company.id) });
  }

  const itemId = cleanString(body?.itemId, 80);
  if (!itemId) return NextResponse.json({ error: "invalid_item" }, { status: 400 });

  const result = await savePricing(context.company.id, context.user.id, {
    itemId,
    practicedPrice: cleanNumber(body?.practicedPrice, 0, 1_000_000),
    minMargin: cleanNumber(body?.minMargin, 0, 0.95),
    laborCost: cleanNumber(body?.laborCost, 0, 1_000_000),
    laborMinutes: cleanNumber(body?.laborMinutes, 0, 100000),
    laborHourlyRate: body?.laborHourlyRate == null ? null : cleanNumber(body?.laborHourlyRate, 0, 1_000_000),
    extraCost: cleanNumber(body?.extraCost, 0, 1_000_000),
    channelKey: cleanString(body?.channelKey, 40) || "direct",
  });
  if (!result.ok) return NextResponse.json({ error: "item_not_found" }, { status: 404 });

  return NextResponse.json({ products: await listPricing(context.company.id) });
}
