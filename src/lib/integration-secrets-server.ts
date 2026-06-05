import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const VERSION = "v1";

function secretMaterial() {
  const configured = process.env.INTEGRATION_SECRETS_KEY || process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET;
  if (configured) return configured;
  if (process.env.NODE_ENV === "production") {
    throw new Error("INTEGRATION_SECRETS_KEY is required in production.");
  }
  return "atelie-os-local-development-secret";
}

function key() {
  return createHash("sha256").update(secretMaterial()).digest();
}

function encode(value: Buffer) {
  return value.toString("base64url");
}

function decode(value: string) {
  return Buffer.from(value, "base64url");
}

export function encryptionConfigured() {
  return Boolean(process.env.INTEGRATION_SECRETS_KEY || process.env.AUTH_SECRET || process.env.BETTER_AUTH_SECRET);
}

export function encryptSecret(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, key(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, encode(iv), encode(tag), encode(encrypted)].join(".");
}

export function decryptSecret(value: string) {
  const [version, iv, tag, encrypted] = value.split(".");
  if (version !== VERSION || !iv || !tag || !encrypted) throw new Error("invalid_encrypted_secret");
  const decipher = createDecipheriv(ALGORITHM, key(), decode(iv));
  decipher.setAuthTag(decode(tag));
  return Buffer.concat([decipher.update(decode(encrypted)), decipher.final()]).toString("utf8");
}

export function redactSecret(value: string | null | undefined) {
  if (!value) return null;
  return value.length <= 8 ? "****" : `${value.slice(0, 4)}****${value.slice(-4)}`;
}
