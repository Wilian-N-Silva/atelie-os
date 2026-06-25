import test from "node:test";
import assert from "node:assert/strict";
import { createInviteToken, hashInviteToken } from "@/lib/invite-tokens";

test("invite tokens expose only a hash for storage", () => {
  const invite = createInviteToken();

  assert.ok(invite.token.length > 30);
  assert.equal(invite.tokenHash, hashInviteToken(invite.token));
  assert.notEqual(invite.tokenHash, invite.token);
  assert.ok(invite.expiresAt.getTime() > Date.now());
});

test("invite token hashes are deterministic and unique per token", () => {
  const first = createInviteToken();
  const second = createInviteToken();

  assert.equal(hashInviteToken(first.token), first.tokenHash);
  assert.notEqual(first.token, second.token);
  assert.notEqual(first.tokenHash, second.tokenHash);
});
