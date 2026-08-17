import { buildGeoSearch } from "../../../utils/geo/geo-search.util";

export const DONOR_GEO_FIELD_KEYS = ["country", "city", "address"] as const;

export type DonorGeoInput = {
  country?: string | null;
  city?: string | null;
  address?: string | null;
};

export const buildDonorGeoSearch = (parts: DonorGeoInput): string =>
  buildGeoSearch({
    country: parts.country,
    city: parts.city,
    address: parts.address,
  });

export const attachDonorGeoSearch = <T extends DonorGeoInput>(
  record: T,
): T & { geo_search: string } => ({
  ...record,
  geo_search: buildDonorGeoSearch(record),
});

export const donorGeoFieldsTouched = (
  patch: Record<string, unknown>,
): boolean =>
  DONOR_GEO_FIELD_KEYS.some((key) => patch[key] !== undefined);
