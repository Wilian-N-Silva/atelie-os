import { createHmac, timingSafeEqual } from "node:crypto";

export type MelhorEnvioWebhookPayload = {
  event: string;
  data: {
    id?: string;
    protocol?: string;
    status?: string;
    tracking?: string | null;
    self_tracking?: string | null;
    user_id?: string;
    tags?: Array<{ tag?: string; url?: string }>;
    tracking_url?: string | null;
    created_at?: string | null;
    paid_at?: string | null;
    generated_at?: string | null;
    posted_at?: string | null;
    delivered_at?: string | null;
    canceled_at?: string | null;
    expired_at?: string | null;
    [key: string]: unknown;
  };
};

export function melhorEnvioWebhookSecret() {
  return process.env.MELHOR_ENVIO_CLIENT_SECRET || "";
}

export function melhorEnvioWebhookSignature(body: string, secret: string) {
  return createHmac("sha256", secret).update(body).digest("base64");
}

export function verifyMelhorEnvioWebhookSignature(body: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = Buffer.from(melhorEnvioWebhookSignature(body, secret), "utf8");
  const received = Buffer.from(signature, "utf8");
  return expected.length === received.length && timingSafeEqual(expected, received);
}

export function parseMelhorEnvioWebhookPayload(value: unknown): MelhorEnvioWebhookPayload | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const event = typeof input.event === "string" && input.event.trim()
    ? input.event.trim()
    : "webhook.test";
  const data = input.data && typeof input.data === "object"
    ? input.data as MelhorEnvioWebhookPayload["data"]
    : input as MelhorEnvioWebhookPayload["data"];
  return { event, data };
}

export function melhorEnvioWebhookTag(payload: MelhorEnvioWebhookPayload, prefix: string) {
  const tags = Array.isArray(payload.data.tags) ? payload.data.tags : [];
  const found = tags.find((item) => typeof item.tag === "string" && item.tag.startsWith(prefix));
  return found?.tag?.slice(prefix.length) || null;
}
