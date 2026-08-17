import {
  DONATION_BOX_AUDIT_PATCH_FIELDS,
  DONATION_BOX_AUDIT_SKIP_KEYS,
} from "./donation-box-audit.constants";
import { DonationBoxAuditChange } from "./donation-box-audit.types";

export function serializeDonationBoxAuditValue(
  value: unknown,
): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean" || typeof value === "number") return value;
  if (Array.isArray(value) || typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

function normalizeForCompare(value: unknown): string {
  const s = serializeDonationBoxAuditValue(value);
  if (s === null) return "";
  return String(s);
}

export function buildDonationBoxFieldChanges(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): DonationBoxAuditChange[] {
  const changes: DonationBoxAuditChange[] = [];

  for (const key of Object.keys(patch)) {
    if (DONATION_BOX_AUDIT_SKIP_KEYS.has(key)) continue;
    if (
      !(DONATION_BOX_AUDIT_PATCH_FIELDS as readonly string[]).includes(key)
    ) {
      continue;
    }

    const oldRaw = before[key];
    const newRaw = patch[key];
    if (normalizeForCompare(oldRaw) === normalizeForCompare(newRaw)) {
      continue;
    }

    changes.push({
      field: key,
      old_value: serializeDonationBoxAuditValue(oldRaw),
      new_value: serializeDonationBoxAuditValue(newRaw),
    });
  }

  return changes;
}
