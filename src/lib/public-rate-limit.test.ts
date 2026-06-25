import assert from "node:assert/strict";
import test from "node:test";
import { checkRateLimit, publicRequestKey } from "@/lib/public-rate-limit";

test("public rate limiter blocks after the configured window quota", () => {
  const key = `test-${Math.random()}`;

  assert.equal(checkRateLimit(key, { limit: 2, windowMs: 1000, now: 100 }).allowed, true);
  assert.equal(checkRateLimit(key, { limit: 2, windowMs: 1000, now: 200 }).allowed, true);

  const blocked = checkRateLimit(key, { limit: 2, windowMs: 1000, now: 300 });
  assert.equal(blocked.allowed, false);
  assert.equal(blocked.retryAfterSeconds, 1);
});

test("public rate limiter resets after the window expires", () => {
  const key = `test-${Math.random()}`;

  assert.equal(checkRateLimit(key, { limit: 1, windowMs: 1000, now: 100 }).allowed, true);
  assert.equal(checkRateLimit(key, { limit: 1, windowMs: 1000, now: 200 }).allowed, false);
  assert.equal(checkRateLimit(key, { limit: 1, windowMs: 1000, now: 1200 }).allowed, true);
});

test("public request key prefers forwarded client IP", () => {
  const request = new Request("https://example.test/api/public/track", {
    headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
  });

  assert.equal(publicRequestKey(request, "track"), "track:203.0.113.10");
});
