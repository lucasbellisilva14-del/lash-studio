import "server-only";

/**
 * Criptografia de segredos guardados no banco (tokens OAuth do MP).
 * AES-256-GCM com chave derivada do AUTH_SECRET — sem env nova.
 * Formato: base64url(iv).base64url(cifrado).base64url(tag)
 */
import crypto from "node:crypto";

function chave(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET ausente — necessário pra cifrar segredos");
  return crypto.createHash("sha256").update(`lashos-secrets:${secret}`).digest();
}

export function encryptSecret(plain: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", chave(), iv);
  const cifrado = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, cifrado, tag].map((b) => b.toString("base64url")).join(".");
}

export function decryptSecret(stored: string): string {
  const [iv, cifrado, tag] = stored.split(".").map((p) => Buffer.from(p, "base64url"));
  const decipher = crypto.createDecipheriv("aes-256-gcm", chave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(cifrado), decipher.final()]).toString("utf8");
}
