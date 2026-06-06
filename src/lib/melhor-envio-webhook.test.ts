import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  melhorEnvioWebhookSignature,
  melhorEnvioWebhookTag,
  parseMelhorEnvioWebhookPayload,
  verifyMelhorEnvioWebhookSignature,
} from "@/lib/melhor-envio-webhook";

describe("Melhor Envio webhook helpers", () => {
  it("validates HMAC SHA-256 signatures", () => {
    const body = JSON.stringify({ event: "order.posted", data: { id: "ord_1" } });
    const signature = melhorEnvioWebhookSignature(body, "secret");
    assert.equal(verifyMelhorEnvioWebhookSignature(body, signature, "secret"), true);
    assert.equal(verifyMelhorEnvioWebhookSignature(body, signature, "other"), false);
  });

  it("accepts order events with data object", () => {
    assert.deepEqual(
      parseMelhorEnvioWebhookPayload({
        event: "order.delivered",
        data: { id: "ord_1", status: "delivered" },
      }),
      { event: "order.delivered", data: { id: "ord_1", status: "delivered" } },
    );
    assert.deepEqual(
      parseMelhorEnvioWebhookPayload({ event: "user.updated", data: {} }),
      { event: "user.updated", data: {} },
    );
  });

  it("accepts generic validation payloads as webhook tests", () => {
    assert.deepEqual(
      parseMelhorEnvioWebhookPayload({ ping: true }),
      { event: "webhook.test", data: { ping: true } },
    );
  });

  it("extracts prefixed tags for future order mapping", () => {
    const payload = parseMelhorEnvioWebhookPayload({
      event: "order.created",
      data: { tags: [{ tag: "atelie:order:123" }] },
    });
    assert.ok(payload);
    assert.equal(melhorEnvioWebhookTag(payload, "atelie:order:"), "123");
  });
});
