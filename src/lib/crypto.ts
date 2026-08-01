import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";
const KEY_ENV = "ENCRYPTION_KEY";

function key() {
  const raw = process.env[KEY_ENV];
  if (!raw) throw new Error(`${KEY_ENV} no está definida`);
  return Buffer.from(raw, "hex");
}

export function encryptSecret(plain: string): string {
  const k = key();
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, k, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(":");
}

export function decryptSecret(payload: string): string {
  const [iv, tag, data] = payload.split(":");
  if (!iv || !tag || !data) throw new Error("Secreto mal formado");
  const decipher = createDecipheriv(ALGO, key(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  const plain = Buffer.concat([
    decipher.update(Buffer.from(data, "base64url")),
    decipher.final(),
  ]);
  return plain.toString("utf8");
}

export function generateEncryptionKey(): string {
  return randomBytes(32).toString("hex");
}
