import assert from "node:assert/strict";
import test from "node:test";
import { encodeCode128, encodeCode39, encodeEan13, encodeQrCode, normalizeEan13 } from "@/lib/barcode-encoders";

function totalWidth(modules: Array<{ width: number }>) {
  return modules.reduce((sum, module) => sum + module.width, 0);
}

test("Code 128 keeps numeric order codes compact with quiet zones", () => {
  const encoded = encodeCode128("040100000931");

  assert.equal(encoded.text, "040100000931");
  assert.equal(encoded.modules[0].black, false);
  assert.equal(encoded.modules.at(-1)?.black, false);
  assert.ok(totalWidth(encoded.modules) < 130);
  assert.ok(encoded.modules.some((module) => module.black));
});

test("Code 39 wraps supported text with quiet zones", () => {
  const encoded = encodeCode39("SKU-01");

  assert.equal(encoded.text, "SKU-01");
  assert.equal(encoded.modules[0].black, false);
  assert.equal(encoded.modules.at(-1)?.black, false);
  assert.ok(totalWidth(encoded.modules) > 100);
});

test("EAN-13 normalizes order codes with checksum", () => {
  assert.equal(normalizeEan13("590123412345"), "5901234123457");

  const encoded = encodeEan13("590123412345");
  assert.equal(encoded.text, "5901234123457");
  assert.equal(totalWidth(encoded.modules), 115);
});

test("QR code includes quiet zone and finder patterns", () => {
  const qr = encodeQrCode("040100000931");
  const at = (row: number, col: number) => qr.cells[row * qr.size + col];

  assert.equal(qr.text, "040100000931");
  assert.equal(qr.size, 37);
  assert.equal(at(0, 0), false);
  assert.equal(at(3, 3), false);
  assert.equal(at(4, 4), true);
  assert.equal(at(10, 10), true);
  assert.equal(at(4, 30), true);
  assert.equal(at(30, 4), true);
});
