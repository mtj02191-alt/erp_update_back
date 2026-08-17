export const normalizeGeoPart = (value?: string | null): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const pickNonEmptyGeoValue = (
  ...values: Array<string | null | undefined>
): string | null => {
  for (const value of values) {
    const trimmed = String(value ?? "").trim();
    if (trimmed) return trimmed;
  }
  return null;
};

/** Build normalized lowercase search blob from structured geo fields. */
export const buildGeoSearch = (parts: {
  country?: string | null;
  city?: string | null;
  address?: string | null;
  extraParts?: Array<string | null | undefined>;
}): string => {
  const combined = [
    normalizeGeoPart(parts.country),
    normalizeGeoPart(parts.city),
    normalizeGeoPart(parts.address),
    ...(parts.extraParts ?? []).map((part) => normalizeGeoPart(part)),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();

  return combined;
};
