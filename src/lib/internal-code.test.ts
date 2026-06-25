import assert from "node:assert/strict";
import test from "node:test";
import { internalCodeKind, scanCodeKinds } from "@/lib/internal-code";

test("classifies internal code prefixes", () => {
  assert.equal(internalCodeKind("010200000042"), "item");
  assert.equal(internalCodeKind("030100000208"), "production");
  assert.equal(internalCodeKind("040100000931"), "order");
  assert.equal(internalCodeKind("050100000001"), "location");
});

test("classifies old UPC-style scanner output through scan candidates", () => {
  const kinds = scanCodeKinds("102000000421");

  assert.ok(kinds.has("item"));
});
