import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;
  if (!keyHex || keyHex.length < 32) {
    throw new Error(
      "ENCRYPTION_KEY must be set in environment variables (at least 32 chars)"
    );
  }
  return crypto.scryptSync(keyHex, "aigo-salt", 32);
}

export function encrypt(plaintext: string): {
  ciphertext: string;
  iv: string;
  authTag: string;
} {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv, {
    authTagLength: AUTH_TAG_LENGTH,
  });

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: encrypted,
    iv: iv.toString("hex"),
    authTag: authTag.toString("hex"),
  };
}

export function decrypt(
  ciphertext: string,
  iv: string,
  authTag: string
): string {
  const key = getKey();
  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(iv, "hex"),
    { authTagLength: AUTH_TAG_LENGTH }
  );
  decipher.setAuthTag(Buffer.from(authTag, "hex"));

  let decrypted = decipher.update(ciphertext, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
