import { createHash, randomBytes } from "crypto";

// Plaintext format: sk_live_<32 hex chars>. We persist only the SHA-256 hash;
// the secret is shown to the user once at creation and never recoverable.
export function generateApiKey() {
  const secret = randomBytes(16).toString("hex");
  const key = `sk_live_${secret}`;
  return {
    key,
    hash: hashApiKey(key),
    prefix: key.slice(0, 12), // "sk_live_a1b2" for display
  };
}

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}
