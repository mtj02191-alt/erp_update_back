import {
  DONOR_AUDIT_PATCH_FIELDS,
  DONOR_AUDIT_SKIP_KEYS,
} from "./donor-audit.constants";
import { DonorAuditChange } from "./donor-audit.types";

export function serializeDonorAuditValue(
  value: unknown,
): string | number | boolean | null {
  if (value === undefined || value === null) return null;
  if (value instanceof Date) return value.toISOString();
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
  const s = serializeDonorAuditValue(value);
  if (s === null) return "";
  return String(s);
}

export function buildDonorFieldChanges(
  before: Record<string, unknown>,
  patch: Record<string, unknown>,
): DonorAuditChange[] {
  const changes: DonorAuditChange[] = [];

  for (const key of Object.keys(patch)) {
    if (DONOR_AUDIT_SKIP_KEYS.has(key)) continue;
    if (
      !(DONOR_AUDIT_PATCH_FIELDS as readonly string[]).includes(key)
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
      old_value: serializeDonorAuditValue(oldRaw),
      new_value: serializeDonorAuditValue(newRaw),
    });
  }

  return changes;
}
