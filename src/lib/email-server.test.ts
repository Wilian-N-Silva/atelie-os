import test from "node:test";
import assert from "node:assert/strict";
import { appBaseUrl, teamInviteUrl } from "@/lib/email-server";

test("team invite URL is built from a normalized app origin", () => {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const previousAuthUrl = process.env.BETTER_AUTH_URL;

  process.env.NEXT_PUBLIC_APP_URL = "https://app.example.com/";
  delete process.env.BETTER_AUTH_URL;

  assert.equal(
    teamInviteUrl("abc+123"),
    "https://app.example.com/?invite=abc%2B123",
  );

  if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  if (previousAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = previousAuthUrl;
});

test("app base URL falls back to the request origin when configured URL is invalid", () => {
  const previousAppUrl = process.env.NEXT_PUBLIC_APP_URL;
  const previousAuthUrl = process.env.BETTER_AUTH_URL;

  process.env.NEXT_PUBLIC_APP_URL = "not a url";
  delete process.env.BETTER_AUTH_URL;

  assert.equal(appBaseUrl("https://tenant.example.com/configuracoes"), "https://tenant.example.com");

  if (previousAppUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previousAppUrl;
  if (previousAuthUrl === undefined) delete process.env.BETTER_AUTH_URL;
  else process.env.BETTER_AUTH_URL = previousAuthUrl;
});
