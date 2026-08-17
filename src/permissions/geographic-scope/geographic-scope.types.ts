export type GeographicEntityKey =
  | "donors"
  | "donations"
  | "donation_boxes"
  | "donation_box_donations";

export type GeographicBypassReason =
  | "not_applicable"
  | "geographic_off"
  | "super_admin"
  | "no_assignments";

export interface ResolvedGeographicScope {
  bypass: boolean;
  reason?: GeographicBypassReason;
  userId: number;
  cityIds: number[];
  cityNames: string[];
  countryNames: string[];
  regionNames: string[];
  districtNames: string[];
  tehsilNames: string[];
  routeIds: number[];
  routeNames: string[];
  /** Lowercased geographic names for address & location substring matching */
  searchTokens: string[];
}

/** Slim scope attached to request.user after auth (no SQL internals). */
export type GeographicScopeSummary =
  | { bypass: true; reason?: GeographicBypassReason }
  | {
      bypass: false;
      cityIds: number[];
      cityNames: string[];
      countryNames: string[];
      regionNames: string[];
      districtNames: string[];
      tehsilNames: string[];
      routeIds: number[];
      routeNames: string[];
      searchTokens: string[];
    };

export interface GeoOwnedRecord {
  created_by?: { id?: number } | number | null;
}

export interface DonationGeoRecord extends GeoOwnedRecord {
  donation_source?: string | null;
  city?: string | null;
  country?: string | null;
  address?: string | null;
  geo_search?: string | null;
  donor_id?: number | null;
  donor?: {
    city?: string | null;
    address?: string | null;
    country?: string | null;
  } | null;
}

export interface DonorGeoRecord extends GeoOwnedRecord {
  city?: string | null;
  address?: string | null;
  country?: string | null;
  geo_search?: string | null;
}

export interface DonationBoxGeoRecord extends GeoOwnedRecord {
  city_id?: number | null;
  route_id?: number | null;
  landmark_marketplace?: string | null;
  geo_search?: string | null;
}
