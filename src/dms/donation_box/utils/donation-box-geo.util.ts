import { buildGeoSearch } from "../../../utils/geo/geo-search.util";

export type DonationBoxGeoLabelSource = {
  landmark_marketplace?: string | null;
  shop_name?: string | null;
  route?: {
    name?: string | null;
    region?: { name?: string | null } | null;
    country?: { name?: string | null } | null;
  } | null;
  city_name?: string | null;
};

export const buildDonationBoxGeoSearch = (
  source: DonationBoxGeoLabelSource,
): string =>
  buildGeoSearch({
    country: source.route?.country?.name ?? null,
    city: source.city_name ?? null,
    address: source.landmark_marketplace ?? null,
    extraParts: [
      source.route?.name,
      source.route?.region?.name,
      source.shop_name,
    ],
  });
