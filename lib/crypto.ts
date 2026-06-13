import "server-only";

import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from "node:crypto";

// AES-256-GCM secretbox. Output format: "v1:<iv_b64>:<ciphertext_b64>:<tag_b64>".
// We derive the AES key from APP_ENCRYPTION_KEY via scrypt with a fixed salt so
// rotating APP_ENCRYPTION_KEY in env automatically invalidates old ciphertexts
// (a deliberate fail-loud signal, not a transparent re-encrypt).

const KEY_VERSION = "v1";
const SCRYPT_SALT = Buffer.from("fkmtime-proxy-secret-v1");

function deriveKey(): Buffer {
  const raw = process.env.APP_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("APP_ENCRYPTION_KEY is not set");
  }
  if (raw.length < 32) {
    throw new Error(
      "APP_ENCRYPTION_KEY must be at least 32 chars (use a long random string)",
    );
  }
  return scryptSync(raw, SCRYPT_SALT, 32);
}

export function encryptSecret(plaintext: string): string {
  const key = deriveKey();
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [
    KEY_VERSION,
    iv.toString("base64"),
    ciphertext.toString("base64"),
    tag.toString("base64"),
  ].join(":");
}

export function decryptSecret(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== KEY_VERSION) {
    throw new Error("Unrecognized encrypted secret format");
  }
  const [, ivB64, ctB64, tagB64] = parts;
  const key = deriveKey();
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivB64, "base64"),
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ctB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

// API keys: opaque 32-byte secret, hex-encoded, prefixed `fkm_`.
// The bearer token shown to the user is `fkm_<hex>`; we store only its
// SHA-256 hash. SHA-256 is fine here because the secret is high-entropy
// (256 bits) — we don't need a slow KDF.

const KEY_PREFIX = "fkm_";

export function generateApiKey(): { plaintext: string; hash: string; lastFour: string } {
  const random = randomBytes(32).toString("hex");
  const plaintext = `${KEY_PREFIX}${random}`;
  return {
    plaintext,
    hash: hashApiKey(plaintext),
    lastFour: plaintext.slice(-4),
  };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}
