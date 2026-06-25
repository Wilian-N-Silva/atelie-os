import assert from "node:assert/strict";
import test from "node:test";
import {
  labelSettingsPayload,
  normalizeBarcodeType,
  parseLabelSheet,
  parseLabelSheets,
  parseLabelTemplate,
} from "@/lib/label-settings";

test("label sheet parser normalizes legacy saved sheets with missing optional layout fields", () => {
  const sheet = parseLabelSheet({
    id: "custom-legacy",
    name: "Legacy",
    code: "legacy",
    cols: 2,
    rows: 7,
    labelW: 50,
    labelH: 30,
  });

  assert.ok(sheet);
  assert.equal(sheet.code, "LEGACY");
  assert.equal(sheet.pageW, 210);
  assert.equal(sheet.pageH, 297);
  assert.equal(sheet.mTop, 9);
  assert.equal(sheet.mLeft, 7);
  assert.equal(sheet.shape, "rect");
});

test("label sheet parser preserves circular 6x6 thermal roll labels", () => {
  const sheet = parseLabelSheet({
    id: "thermal-circle-60",
    name: "Termica redonda 6x6",
    code: "circ-60",
    pageW: 60,
    pageH: 60,
    cols: 1,
    rows: 1,
    labelW: 60,
    labelH: 60,
    mTop: 0,
    mLeft: 0,
    gutX: 0,
    gutY: 0,
    roll: true,
    shape: "circle",
  });

  assert.ok(sheet);
  assert.equal(sheet.shape, "circle");
  assert.equal(sheet.roll, true);
  assert.equal(sheet.labelW, 60);
  assert.equal(sheet.labelH, 60);
});

test("label sheet parser rejects impossible sheet grids", () => {
  assert.equal(parseLabelSheets([{
    id: "too-many",
    name: "Too many",
    code: "TM",
    cols: 21,
    rows: 10,
    labelW: 10,
    labelH: 10,
  }]), null);
});

test("label template parser keeps valid fields and normalizes elements", () => {
  const template = parseLabelTemplate({
    id: "custom-item",
    name: " Item ",
    target: "item",
    icon: "",
    w: 50,
    h: 30,
    desc: "custom",
    fields: ["name", "sku", "invalid"],
    elements: [
      { id: "text-1", type: "text", value: "Aroma", x: -10, y: 120, w: 200, h: 2, fontSize: 99, align: "right" },
      { id: "bad", type: "text", value: "" },
    ],
  });

  assert.ok(template);
  assert.deepEqual(template.fields, ["name", "sku"]);
  assert.equal(template.elements?.length, 1);
  assert.equal(template.elements?.[0].x, 0);
  assert.equal(template.elements?.[0].y, 100);
  assert.equal(template.elements?.[0].fontSize, 48);
});

test("label settings payload falls back to defaults and validates barcode type", () => {
  const payload = labelSettingsPayload({});

  assert.ok(payload.sheets.length > 0);
  assert.ok(payload.templates.length > 0);
  assert.equal(payload.defaultBarcodeType, "code128");
  assert.equal(normalizeBarcodeType("qr"), "qr");
  assert.equal(normalizeBarcodeType("pdf417"), null);
});
