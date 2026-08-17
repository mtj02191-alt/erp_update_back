/**
 * Whitelisted fields and label mapping per entity for GET /{resource}/options.
 * Each module imports its profile slice in listForOptions().
 */

export type LookupProfile = {
  valueField: string;
  labelField: string;
  fields: readonly string[];
  defaultLimit: number;
  maxLimit: number;
};

export const LOOKUP_PROFILES = {
  appeals: {
    valueField: "id",
    labelField: "title",
    fields: ["id", "title"],
    defaultLimit: 500,
    maxLimit: 500,
  },
  workflow_templates: {
    valueField: "id",
    labelField: "name",
    fields: ["id", "name", "code"],
    defaultLimit: 200,
    maxLimit: 500,
  },
  donors: {
    valueField: "id",
    labelField: "name",
    fields: ["id", "name", "email"],
    defaultLimit: 200,
    maxLimit: 500,
  },
  users: {
    valueField: "id",
    labelField: "full_name",
    fields: ["id", "email", "first_name", "last_name"],
    defaultLimit: 200,
    maxLimit: 500,
  },
  donations: {
    valueField: "id",
    labelField: "id",
    fields: ["id", "amount", "status", "created_at"],
    defaultLimit: 200,
    maxLimit: 500,
  },
  donation_box: {
    valueField: "id",
    labelField: "name",
    fields: ["id", "name", "city_id"],
    defaultLimit: 200,
    maxLimit: 500,
  },
} as const satisfies Record<string, LookupProfile>;

export type LookupEntityKey = keyof typeof LOOKUP_PROFILES;
