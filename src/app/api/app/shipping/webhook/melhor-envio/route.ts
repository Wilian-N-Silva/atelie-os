import { NextResponse } from "next/server";
import { db } from "@/db/client";
import { auditLogs } from "@/db/schema";
import {
  melhorEnvioWebhookSecret,
  melhorEnvioWebhookTag,
  parseMelhorEnvioWebhookPayload,
  verifyMelhorEnvioWebhookSignature,
} from "@/lib/melhor-envio-webhook";
import { applyMelhorEnvioShipmentUpdate } from "@/lib/shipping-integrations-server";

export const runtime = "nodejs";

function compactMetadata(payload: NonNullable<ReturnType<typeof parseMelhorEnvioWebhookPayload>>) {
  return {
    provider: "melhor_envio",
    event: payload.event,
    orderId: payload.data.id ?? null,
    protocol: payload.data.protocol ?? null,
    status: payload.data.status ?? null,
    tracking: payload.data.tracking ?? payload.data.self_tracking ?? null,
    trackingUrl: payload.data.tracking_url ?? null,
    melhorEnvioUserId: payload.data.user_id ?? null,
    atelieOrderId: melhorEnvioWebhookTag(payload, "atelie:order:"),
    atelieCompanyId: melhorEnvioWebhookTag(payload, "atelie:company:"),
    timestamps: {
      createdAt: payload.data.created_at ?? null,
      paidAt: payload.data.paid_at ?? null,
      generatedAt: payload.data.generated_at ?? null,
      postedAt: payload.data.posted_at ?? null,
      deliveredAt: payload.data.delivered_at ?? null,
      canceledAt: payload.data.canceled_at ?? null,
      expiredAt: payload.data.expired_at ?? null,
    },
  };
}

export async function POST(request: Request) {
  const body = await request.text();
  const secret = melhorEnvioWebhookSecret();
  const signature = request.headers.get("x-me-signature");

  if (!verifyMelhorEnvioWebhookSignature(body, signature, secret)) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  const json = await Promise.resolve()
    .then(() => JSON.parse(body || "{}") as unknown)
    .catch(() => null);
  const payload = parseMelhorEnvioWebhookPayload(json);
  if (!payload) return NextResponse.json({ error: "invalid_webhook" }, { status: 400 });

  const metadata = compactMetadata(payload);

  // Persist tracking/status back onto the owning order (matched by the shipment's
  // externalId) so the operator sees the tracking code without a manual lookup.
  const applied = metadata.orderId
    ? await applyMelhorEnvioShipmentUpdate({
        externalId: metadata.orderId,
        status: metadata.status,
        protocol: metadata.protocol,
        tracking: metadata.tracking,
        trackingUrl: metadata.trackingUrl,
      })
    : null;

  await db.insert(auditLogs).values({
    companyId: applied?.companyId ?? metadata.atelieCompanyId ?? null,
    actorUserId: null,
    action: "shipping.update",
    entityType: "order",
    entityId: applied?.orderId ?? metadata.orderId ?? metadata.protocol ?? payload.event,
    metadata: { ...metadata, matchedOrderId: applied?.orderId ?? null },
  });

  return NextResponse.json({ ok: true });
}
