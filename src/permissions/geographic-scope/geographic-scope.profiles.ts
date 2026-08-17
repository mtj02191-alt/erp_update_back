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

export const GEOGRAPHIC_DMS_DEPARTMENT = "fund_raising";
