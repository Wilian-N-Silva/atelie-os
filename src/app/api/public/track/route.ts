import { NextResponse } from "next/server";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { orders } from "@/db/schema";
import { buildPublicTracking, type PublicPaymentStatus } from "@/lib/public-tracking";

export const runtime = "nodejs";

// Public, read-only tracking API consumed by the (separate) company website
// from another origin. No auth, no PII/costs/tokens in the response.
const CORS_HEADERS: Record<string, string> = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET, OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

function json(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

function cleanParam(value: string | null, max: number) {
  return (value ?? "").trim().slice(0, max);
}

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = cleanParam(url.searchParams.get("token"), 64);
  const number = cleanParam(url.searchParams.get("order"), 40);
  const email = cleanParam(url.searchParams.get("email"), 160).toLowerCase();
  const cep = cleanParam(url.searchParams.get("cep"), 16).replace(/\D/g, "").slice(0, 8);

  const columns = {
    number: orders.number,
    status: orders.status,
    paymentStatus: orders.paymentStatus,
    tracking: orders.tracking,
    createdAt: orders.createdAt,
    metadata: orders.metadata,
  } as const;

  let row;
  if (token) {
    [row] = await db.select(columns).from(orders).where(eq(orders.trackToken, token)).limit(1);
  } else if (number && (email || cep)) {
    // The order number is company-scoped, so the email/CEP is the authorization
    // factor that makes the lookup safe and effectively unique.
    const identity = email
      ? sql`lower(${orders.metadata} ->> 'customerEmail') = ${email}`
      : sql`(${orders.metadata} -> 'customerAddress' ->> 'postalCode') = ${cep}`;
    [row] = await db.select(columns).from(orders).where(and(eq(orders.number, number), identity)).limit(1);
  } else {
    return json({ error: "missing_params" }, 400);
  }

  // Generic 404 either way so the endpoint cannot be used to probe order existence.
  if (!row) return json({ error: "not_found" }, 404);

  const metadata = (row.metadata ?? {}) as Record<string, unknown>;
  const label = (metadata.shippingLabel && typeof metadata.shippingLabel === "object"
    ? metadata.shippingLabel
    : null) as PublicTrackingShippingLabel | null;
  const quote = (metadata.shippingQuote && typeof metadata.shippingQuote === "object"
    ? metadata.shippingQuote
    : null) as PublicTrackingShippingQuote | null;

  const payload = buildPublicTracking({
    number: row.number,
    placedAt: row.createdAt ? row.createdAt.toISOString() : null,
    status: row.status,
    payment: (row.paymentStatus === "pago" ? "pago" : "aguardando") as PublicPaymentStatus,
    tracking: row.tracking,
    shippingLabel: label,
    shippingQuote: quote,
  });

  return json(payload);
}

type PublicTrackingShippingLabel = {
  company?: string | null;
  serviceName?: string | null;
  tracking?: string | null;
  trackingUrl?: string | null;
  generatedAt?: string | null;
  postedAt?: string | null;
  deliveredAt?: string | null;
};

type PublicTrackingShippingQuote = {
  company?: string | null;
  serviceName?: string | null;
  deliveryTime?: number | null;
};
