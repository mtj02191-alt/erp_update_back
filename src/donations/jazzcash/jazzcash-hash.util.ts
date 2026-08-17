import * as crypto from "crypto";

/**
 * JazzCash HMAC-SHA256 (2026):
 * - Include all non-empty fields except pp_SecureHash
 * - Sort keys ascending (ASCII)
 * - Join values with &
 * - Prepend integrity salt: `{salt}&{values...}`
 * - HMAC-SHA256 with integrity salt as secret key
 */
export function buildJazzCashSecureHash(
  fields: Record<string, string | number | null | undefined>,
  integritySalt: string,
): string {
  const sortedKeys = Object.keys(fields)
    .filter((k) => k !== "pp_SecureHash")
    .sort((a, b) => a.localeCompare(b));

  const values: string[] = [];
  for (const key of sortedKeys) {
    const raw = fields[key];
    const str = raw == null ? "" : String(raw).trim();
    if (str === "") continue;
    values.push(str);
  }

  const message = `${integritySalt}&${values.join("&")}`;
  return crypto
    .createHmac("sha256", integritySalt)
    .update(message)
    .digest("hex")
    .toUpperCase();
}

export function verifyJazzCashSecureHash(
  fields: Record<string, unknown>,
  integritySalt: string,
): boolean {
  const received = String(fields.pp_SecureHash || "")
    .trim()
    .toUpperCase();
  if (!received) return false;

  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(fields)) {
    normalized[k] = v == null ? "" : String(v);
  }

  const expected = buildJazzCashSecureHash(normalized, integritySalt);
  return expected === received;
}
