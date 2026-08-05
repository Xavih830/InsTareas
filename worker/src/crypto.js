import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const ALGO = "aes-256-gcm";

function key() {
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) throw new Error("ENCRYPTION_KEY no está definida");
  return Buffer.from(raw, "hex");
}

export function encryptSecret(plain) {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, key(), iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(":");
}

export function decryptSecret(payload) {
  if (!payload) return null;
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
