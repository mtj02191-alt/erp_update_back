import { GeographicEntityKey } from "./geographic-scope.types";

/**
 * Registry of DMS entities that participate in geographic filtering.
 * Column matching logic is implemented in GeographicScopeService per entity key.
 */
export const GEOGRAPHIC_DMS_ENTITY_KEYS: GeographicEntityKey[] = [
  "donors",
  "donations",
  "donation_boxes",
  "donation_box_donations",
];

/** Departments that can receive geographic assignments on the user record. */
export const GEOGRAPHIC_ASSIGNMENT_DEPARTMENTS = [
  "fund_raising",
  "crd",
] as const;

/** @deprecated Use GEOGRAPHIC_ASSIGNMENT_DEPARTMENTS — kept for DMS filter module key. */
export const GEOGRAPHIC_DMS_DEPARTMENT = "fund_raising";

export function isGeographicAssignmentDepartment(
  department: string | null | undefined,
): boolean {
  const d = String(department || "")
    .trim()
    .toLowerCase();
  return (GEOGRAPHIC_ASSIGNMENT_DEPARTMENTS as readonly string[]).includes(d);
}
