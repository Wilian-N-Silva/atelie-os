import assert from "node:assert/strict";
import test from "node:test";
import { scanCandidates } from "@/lib/scan-candidates";

test("scan candidates accept EAN-13 checksum suffix for internal 12-digit codes", () => {
  const values = scanCandidates("0103000012876");

  assert.ok(values.has("0103000012876"));
  assert.ok(values.has("010300001287"));
});

test("scan candidates restore leading zero for UPC-style scanner output", () => {
  const values = scanCandidates("10300001287");

  assert.ok(values.has("10300001287"));
  assert.ok(values.has("010300001287"));
});

test("scan candidates unwrap code payloads and Code 39 guard asterisks", () => {
  const values = scanCandidates("codigo=*SKU-01*");

  assert.ok(values.has("sku-01"));
});
