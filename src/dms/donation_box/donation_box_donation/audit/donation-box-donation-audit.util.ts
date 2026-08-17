import {
  DONATION_BOX_DONATION_AUDIT_PATCH_FIELDS,
  DONATION_BOX_DONATION_AUDIT_SKIP_KEYS,
} from "./donation-box-donation-audit.constants";
import { DonationBoxDonationAuditChange } from "./donation-box-donation-audit.types";

export function serializeDonationBoxDonationAuditValue(
  value: unknown,
): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === "boolean" || typeof value === "number") {
    return value;
  }
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
  const s = serializeDonationBoxDonationAuditValue(value);
  if (s === null) return "";
  return String(s);
}

export function buildDonationBoxDonationFieldChanges(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): DonationBoxDonationAuditChange[] {
  const changes: DonationBoxDonationAuditChange[] = [];

  for (const key of Object.keys(patch)) {
    if (DONATION_BOX_DONATION_AUDIT_SKIP_KEYS.has(key)) continue;
    if (
      !(DONATION_BOX_DONATION_AUDIT_PATCH_FIELDS as readonly string[]).includes(
        key,
      )
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
      old_value: serializeDonationBoxDonationAuditValue(oldRaw),
      new_value: serializeDonationBoxDonationAuditValue(newRaw),
    });
  }

  return changes;
}

export function buildDonationBoxDonationStatusChange(
  oldStatus: string | null | undefined,
  newStatus: string,
): DonationBoxDonationAuditChange[] {
  if (normalizeForCompare(oldStatus) === normalizeForCompare(newStatus)) {
    return [];
  }
  return [
    {
      field: "status",
      old_value: serializeDonationBoxDonationAuditValue(oldStatus),
      new_value: serializeDonationBoxDonationAuditValue(newStatus),
    },
  ];
}
