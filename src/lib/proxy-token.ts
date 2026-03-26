import crypto from "node:crypto";

const PROXY_SALT = "aigo-proxy-token";

function getSecret(): string {
  const key = process.env.ENCRYPTION_KEY;
  if (!key || key.length < 32) {
    throw new Error("ENCRYPTION_KEY must be set (at least 32 chars)");
  }
  return key;
}

/**
 * Generate a deterministic HMAC-SHA256 proxy token for a service.
 * No extra DB columns needed — derived from ENCRYPTION_KEY + serviceId.
 */
export function generateProxyToken(serviceId: string): string {
  const hmac = crypto.createHmac("sha256", getSecret());
  hmac.update(`${PROXY_SALT}:${serviceId}`);
  return hmac.digest("hex");
}

/**
 * Verify a proxy token using timing-safe comparison.
 */
export function verifyProxyToken(serviceId: string, token: string): boolean {
  const expected = generateProxyToken(serviceId);
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(
    Buffer.from(expected, "hex"),
    Buffer.from(token, "hex")
  );
}
