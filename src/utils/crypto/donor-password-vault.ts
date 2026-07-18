import * as crypto from "crypto";

type EncVersion = 1;

function getKeyV1(): Buffer {
  const raw = process.env.DONOR_PASSWORD_ENC_KEY || "";
  // Support either base64 or hex; prefer base64
  let key: Buffer | null = null;
  try {
    key = Buffer.from(raw, "base64");
    if (key.length !== 32) key = null;
  } catch {}
  if (!key) {
    try {
      key = Buffer.from(raw, "hex");
      if (key.length !== 32) key = null;
    } catch {}
  }
  if (!key) {
    throw new Error("DONOR_PASSWORD_ENC_KEY must be 32 bytes (base64 or hex)");
  }
  return key;
}

export function generateRandomPassword(): string {
  // URL-safe, high entropy, reasonable to send via WhatsApp
  return crypto.randomBytes(12).toString("base64url"); // ~16 chars
}

export function encryptDonorPassword(plaintext: string): {
  version: EncVersion;
  payload: string;
} {
  const key = getKeyV1();
  const iv = crypto.randomBytes(12); // GCM standard
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  // payload = iv.tag.ciphertext (base64)
  const payload = [
    iv.toString("base64"),
    tag.toString("base64"),
    ct.toString("base64"),
  ].join(".");

  return { version: 1, payload };
}

export function decryptDonorPassword(payload: string, version: number): string {
  if (version !== 1) throw new Error("Unsupported donor password version");
  const key = getKeyV1();
  const parts = String(payload || "").split(".");
  if (parts.length !== 3) throw new Error("Invalid encrypted payload format");

  const [ivB64, tagB64, ctB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
