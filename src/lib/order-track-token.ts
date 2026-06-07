import { randomBytes } from "node:crypto";

/**
 * Opaque, unguessable public tracking token for an order. It is intentionally
 * NOT derived from the order id or number so the public tracking link cannot be
 * guessed by incrementing a number.
 */
export function generateOrderTrackToken() {
  return randomBytes(16).toString("hex"); // 32 hex chars
}
