import {
  buildGeoSearch,
  pickNonEmptyGeoValue,
} from "../../utils/geo/geo-search.util";

export type DonationGeoDonorSnapshot = {
  country?: string | null;
  city?: string | null;
  address?: string | null;
};

export type DonationGeoFields = {
  country: string | null;
  city: string | null;
  address: string | null;
  geo_search: string;
};

/** Build normalized search blob from structured donation geo fields. */
export const buildDonationGeoSearch = (parts: {
  country?: string | null;
  city?: string | null;
  address?: string | null;
}): string =>
  buildGeoSearch({
    country: parts.country,
    city: parts.city,
    address: parts.address,
  });

export { pickNonEmptyGeoValue };

/** Snapshot for new donations: DTO first, then donor fallback. */
export const buildDonationGeoSnapshotForCreate = (
  input: {
    country?: string | null;
    city?: string | null;
    address?: string | null;
  },
  donor?: DonationGeoDonorSnapshot | null,
): DonationGeoFields => {
  const country = pickNonEmptyGeoValue(input.country, donor?.country);
  const city = pickNonEmptyGeoValue(input.city, donor?.city);
  const address = pickNonEmptyGeoValue(
    input.address,
    donor?.address,
  );

  return {
    country,
    city,
    address,
    geo_search: buildDonationGeoSearch({ country, city, address }),
  };
};

/** Backfill: never overwrite existing donation values; fill blanks from donor. */
export const buildDonationGeoSnapshotForBackfill = (
  donation: {
    country?: string | null;
    city?: string | null;
    address?: string | null;
  },
  donor?: DonationGeoDonorSnapshot | null,
): DonationGeoFields => {
  const country = pickNonEmptyGeoValue(donation.country, donor?.country);
  const city = pickNonEmptyGeoValue(donation.city, donor?.city);
  const address = pickNonEmptyGeoValue(
    donation.address,
    donor?.address,
  );

  return {
    country,
    city,
    address,
    geo_search: buildDonationGeoSearch({ country, city, address }),
  };
};

/** Staff PATCH: merge existing row with patch; do not pull from donor. */
export const mergeDonationGeoForUpdate = (
  existing: {
    country?: string | null;
    city?: string | null;
    address?: string | null;
  },
  patch: {
    country?: string | null;
    city?: string | null;
    address?: string | null;
  },
): DonationGeoFields => {
  const country =
    patch.country !== undefined
      ? pickNonEmptyGeoValue(patch.country)
      : pickNonEmptyGeoValue(existing.country);
  const city =
    patch.city !== undefined
      ? pickNonEmptyGeoValue(patch.city)
      : pickNonEmptyGeoValue(existing.city);
  const address =
    patch.address !== undefined
      ? pickNonEmptyGeoValue(patch.address)
      : pickNonEmptyGeoValue(existing.address);

  return {
    country,
    city,
    address,
    geo_search: buildDonationGeoSearch({ country, city, address }),
  };
};

export const donationGeoSnapshotIsEmpty = (fields: {
  country?: string | null;
  city?: string | null;
  address?: string | null;
  geo_search?: string | null;
}): boolean =>
  !pickNonEmptyGeoValue(fields.country) &&
  !pickNonEmptyGeoValue(fields.city) &&
  !pickNonEmptyGeoValue(fields.address) &&
  !pickNonEmptyGeoValue(fields.geo_search);
