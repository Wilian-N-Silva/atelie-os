import assert from "node:assert/strict";
import { test } from "node:test";

process.env.DATABASE_URL ??= "postgres://test:test@localhost:5432/test";

test("normalizes Melhor Envio cart shipment response", async () => {
  const { normalizeMelhorEnvioCartShipment } = await import("@/lib/shipping-integrations-server");
  const shipment = normalizeMelhorEnvioCartShipment({
    id: "9c6f363e-f03a-451e-b198-a24c5be735fb",
    protocol: "ORD-202407210331",
    status: "pending",
    price: "15.96",
    tracking: null,
    tracking_url: "https://example.test/rastreio",
  });

  assert.deepEqual(shipment, {
    id: "9c6f363e-f03a-451e-b198-a24c5be735fb",
    protocol: "ORD-202407210331",
    status: "pending",
    price: 15.96,
    tracking: null,
    trackingUrl: "https://example.test/rastreio",
  });
});

test("extracts tracking from a nested generate-style shipment response", async () => {
  const { extractTracking, extractTrackingUrl } = await import("@/lib/shipping-integrations-server");
  const payload = {
    "9c6f363e-f03a-451e-b198-a24c5be735fb": {
      id: "9c6f363e-f03a-451e-b198-a24c5be735fb",
      status: "released",
      tracking: "OY987654321BR",
      tracking_url: "https://example.test/rastreio/OY987654321BR",
    },
  };

  assert.equal(extractTracking(payload), "OY987654321BR");
  assert.equal(extractTrackingUrl(payload), "https://example.test/rastreio/OY987654321BR");
});

test("tracking extraction falls back to self_tracking and ignores blanks", async () => {
  const { extractTracking, extractTrackingUrl } = await import("@/lib/shipping-integrations-server");
  assert.equal(extractTracking({ tracking: "  ", self_tracking: "BR123" }), "BR123");
  assert.equal(extractTracking({ status: "pending" }), null);
  assert.equal(extractTrackingUrl({ tracking_url: "not-a-url" }), null);
});

test("normalizes Melhor Envio quote response without errored services", async () => {
  const { normalizeMelhorEnvioQuote } = await import("@/lib/shipping-integrations-server");
  const services = normalizeMelhorEnvioQuote([
    { id: 1, name: "PAC", price: "20.00", company: { name: "Correios" }, delivery_time: 6 },
    { id: 2, error: "trecho indisponivel" },
    { id: 4, name: ".Com", custom_price: "15.96", company: { name: "Jadlog" }, custom_delivery_time: 5 },
  ]);

  assert.equal(services.length, 2);
  assert.equal(services[0].id, "4");
  assert.equal(services[0].price, 15.96);
});
