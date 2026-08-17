import * as crypto from "crypto";

/** AES-128-CBC PKCS7 — matches APG Merchant Integration Guide (CryptoJS sample). */
export function encryptApgRequestHash(
  mapString: string,
  key1: string,
  key2: string,
): string {
  const key = Buffer.from(key1, "utf8");
  const iv = Buffer.from(key2, "utf8");
  if (key.length !== 16 || iv.length !== 16) {
    throw new Error(
      "APG encryption keys must be 16 UTF-8 characters each (set APG_KEY1/APG_KEY2, or ALFALAH_SANDBOX_KEY1/KEY2 when ALFALAH_ENV=sandbox)",
    );
  }
  const cipher = crypto.createCipheriv("aes-128-cbc", key, iv);
  let encrypted = cipher.update(mapString, "utf8", "base64");
  encrypted += cipher.final("base64");
  return encrypted;
}

/** Build `key=value&...` string (no trailing ampersand). */
export function buildApgMapString(
  orderedFields: Array<[string, string]>,
): string {
  return orderedFields.map(([k, v]) => `${k}=${v ?? ""}`).join("&");
}

export function buildApgRequestHash(
  orderedFields: Array<[string, string]>,
  key1: string,
  key2: string,
): string {
  return encryptApgRequestHash(buildApgMapString(orderedFields), key1, key2);
}
