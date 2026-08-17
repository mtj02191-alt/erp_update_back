import type { LookupProfile } from "./lookup-profiles.constants";

export type LookupOption = {
  value: string;
  label: string;
};

export function clampLookupLimit(
  limit: number | undefined,
  profile: Pick<LookupProfile, "defaultLimit" | "maxLimit">,
): number {
  const requested = Number(limit ?? profile.defaultLimit);
  if (!Number.isFinite(requested) || requested <= 0) {
    return profile.defaultLimit;
  }
  return Math.min(Math.floor(requested), profile.maxLimit);
}

export function toLookupOptions<T extends Record<string, unknown>>(
  rows: T[],
  profile: Pick<LookupProfile, "valueField" | "labelField"> & {
    labelFallback?: (row: T) => string;
  },
): LookupOption[] {
  return rows.map((row) => {
    const value = row[profile.valueField];
    const labelRaw = row[profile.labelField];
    const label =
      labelRaw != null && String(labelRaw).trim() !== ""
        ? String(labelRaw)
        : (profile.labelFallback?.(row) ?? String(value ?? ""));
    return { value: String(value ?? ""), label };
  });
}

export function selectEntityFields(
  alias: string,
  fields: readonly string[],
): string[] {
  return fields.map((field) => `${alias}.${field}`);
}
