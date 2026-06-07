import assert from "node:assert/strict";
import { test } from "node:test";
import { parseOrdersCsv } from "@/lib/import-orders";

test("groups CSV rows by order and maps aliased columns", () => {
  const csv = [
    "pedido;cliente;email;sku;quantidade;preco",
    "ML-1;Ana;ana@x.com;VEL-LAV-156;2;75,00",
    "ML-1;Ana;ana@x.com;VEL-CAP-156;1;70,00",
    "ML-2;Bruno;bruno@x.com;VEL-LAV-156;1;75,00",
  ].join("\n");

  const orders = parseOrdersCsv(csv);
  assert.equal(orders.length, 2);
  const first = orders.find((o) => o.externalOrderId === "ML-1")!;
  assert.equal(first.buyerName, "Ana");
  assert.equal(first.lines.length, 2);
  assert.equal(first.total, 220); // 2*75 + 1*70
});

test("supports comma delimiter", () => {
  const csv = [
    "order,buyer,sku,qty,price",
    "S-9,Carla,KIT-RIT,1,1234.56",
  ].join("\n");
  const orders = parseOrdersCsv(csv);
  assert.equal(orders.length, 1);
  assert.equal(orders[0].lines[0].sku, "KIT-RIT");
  assert.equal(orders[0].total, 1234.56);
});

test("parses BR thousand+decimal with semicolon delimiter", () => {
  const orders = parseOrdersCsv("pedido;sku;qtd;preco\nML-3;X;1;1.234,56");
  assert.equal(orders[0].total, 1234.56);
});

test("returns empty without required columns", () => {
  assert.deepEqual(parseOrdersCsv("foo;bar\n1;2"), []);
  assert.deepEqual(parseOrdersCsv(""), []);
});
