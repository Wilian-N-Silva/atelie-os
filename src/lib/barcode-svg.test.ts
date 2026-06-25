import assert from "node:assert/strict";
import test from "node:test";
import { renderBarcodeSvg } from "@/lib/barcode-svg";

test("bwip-js renders Code 128 as SVG", () => {
  const rendered = renderBarcodeSvg({ code: "010300001287", type: "code128", heightMm: 14, widthMm: 48 });

  assert.equal(rendered.text, "010300001287");
  assert.match(rendered.svg, /^<svg /);
  assert.match(rendered.svg, /viewBox=/);
});

test("bwip-js renders settings preview codes without explicit width", () => {
  for (const type of ["code128", "code39", "ean13"] as const) {
    const rendered = renderBarcodeSvg({ code: "010300001287", type, heightMm: 14 });

    assert.equal(/codigo invalido/.test(rendered.svg), false);
    assert.match(rendered.svg, /^<svg /);
  }
});

test("bwip-js normalizes EAN-13 with checksum", () => {
  const rendered = renderBarcodeSvg({ code: "590123412345", type: "ean13", heightMm: 14, widthMm: 48 });

  assert.equal(rendered.text, "5901234123457");
  assert.match(rendered.svg, /^<svg /);
});

test("bwip-js preserves internal codes when EAN-13 is selected", () => {
  const rendered = renderBarcodeSvg({ code: "010300001287", type: "ean13", heightMm: 14 });

  assert.equal(rendered.text, "010300001287");
  assert.match(rendered.svg, /^<svg /);
});

test("bwip-js keeps internal codes exact when EAN-13 is selected", () => {
  const caixa = renderBarcodeSvg({ code: "010200000042", type: "ean13", heightMm: 14 });
  const essencia = renderBarcodeSvg({ code: "010100000049", type: "ean13", heightMm: 14 });

  assert.equal(caixa.text, "010200000042");
  assert.equal(essencia.text, "010100000049");
  assert.match(caixa.svg, /^<svg /);
  assert.match(essencia.svg, /^<svg /);
});

test("bwip-js sanitizes Code 39 text before rendering", () => {
  const rendered = renderBarcodeSvg({ code: "óleo-01", type: "code39", heightMm: 14, widthMm: 48 });

  assert.equal(rendered.text, "LEO-01");
  assert.match(rendered.svg, /^<svg /);
});
