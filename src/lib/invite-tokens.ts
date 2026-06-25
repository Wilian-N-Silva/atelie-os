import { createHash, randomBytes } from "node:crypto";

const INVITE_TOKEN_BYTES = 32;
const INVITE_TTL_DAYS = 14;

export function createInviteToken() {
  const token = randomBytes(INVITE_TOKEN_BYTES).toString("base64url");
  return {
    token,
    tokenHash: hashInviteToken(token),
    expiresAt: inviteExpiresAt(),
  };
}

export function hashInviteToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function inviteExpiresAt() {
  return new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
}
