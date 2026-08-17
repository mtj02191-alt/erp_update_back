import {
  DONATION_AUDIT_NOTE_FIELDS,
  DONATION_AUDIT_PATCH_FIELDS,
  DONATION_AUDIT_SKIP_PATCH_KEYS,
} from "./donation-audit.constants";
import { DonationAuditChange } from "./donation-audit.types";

export function serializeDonationAuditValue(
  value: unknown,
): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }
  return String(value);
}

function normalizeForCompare(value: unknown): string {
  const s = serializeDonationAuditValue(value);
  if (s === null) return "";
  return String(s);
}

export function buildDonationFieldChanges(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): DonationAuditChange[] {
  const changes: DonationAuditChange[] = [];

  for (const key of Object.keys(patch)) {
    if (DONATION_AUDIT_SKIP_PATCH_KEYS.has(key)) continue;

    const allowed =
      (DONATION_AUDIT_PATCH_FIELDS as readonly string[]).includes(key) ||
      (DONATION_AUDIT_NOTE_FIELDS as readonly string[]).includes(key);
    if (!allowed) continue;

    const oldRaw = before[key];
    const newRaw = patch[key];
    if (normalizeForCompare(oldRaw) === normalizeForCompare(newRaw)) {
      continue;
    }

    changes.push({
      field: key,
      old_value: serializeDonationAuditValue(oldRaw),
      new_value: serializeDonationAuditValue(newRaw),
    });
  }

  return changes;
}

export function buildDonationStatusChange(
  oldStatus: string | null | undefined,
  newStatus: string,
): DonationAuditChange[] {
  if (normalizeForCompare(oldStatus) === normalizeForCompare(newStatus)) {
    return [];
  }
  return [
    {
      field: "status",
      old_value: serializeDonationAuditValue(oldStatus),
      new_value: serializeDonationAuditValue(newStatus),
    },
  ];
}
