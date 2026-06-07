import { createHmac, timingSafeEqual } from "node:crypto";

type OAuthStatePayload = {
  companyId: string;
  userId: string;
  provider: string;
  exp: number;
};

function stateKey() {
  const key = process.env.INTEGRATION_SECRETS_KEY || process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (key) return key;
  if (process.env.NODE_ENV === "production") throw new Error("INTEGRATION_SECRETS_KEY is required in production.");
  return "atelie-os-local-development-secret";
}

function b64(value: string | Buffer) {
  return Buffer.from(value).toString("base64url");
}

function sign(payload: string) {
  return createHmac("sha256", stateKey()).update(payload).digest("base64url");
}

export function createOAuthState(input: Omit<OAuthStatePayload, "exp">, ttlMs = 10 * 60 * 1000) {
  const payload = b64(JSON.stringify({ ...input, exp: Date.now() + ttlMs }));
  return `${payload}.${sign(payload)}`;
}

export function verifyOAuthState(value: string | null, expected: Omit<OAuthStatePayload, "exp">) {
  if (!value) return null;
  const [payloadPart, signature] = value.split(".");
  if (!payloadPart || !signature) return null;
  const expectedSignature = sign(payloadPart);
  if (signature.length !== expectedSignature.length) return null;
  if (
    !timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(expectedSignature, "utf8"),
    )
  ) {
    return null;
  }

  const payload = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8")) as OAuthStatePayload;
  if (payload.exp < Date.now()) return null;
  if (payload.companyId !== expected.companyId || payload.userId !== expected.userId || payload.provider !== expected.provider) {
    return null;
  }
  return payload;
}
