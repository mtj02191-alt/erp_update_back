/** Geographic assignment slice attached to request.user and login responses. */
export type UserGeographicContext = {
  assigned_countries: number[] | null;
  assigned_regions: number[] | null;
  assigned_districts: number[] | null;
  assigned_tehsils: number[] | null;
  assigned_cities: number[] | null;
  assigned_routes: number[] | null;
  geographic_off: boolean;
  manager_id: number | null;
};

export const USER_GEOGRAPHIC_SELECT = [
  "user.id",
  "user.assigned_countries",
  "user.assigned_regions",
  "user.assigned_districts",
  "user.assigned_tehsils",
  "user.assigned_cities",
  "user.assigned_routes",
  "user.geographic_off",
  "user.manager_id",
  "user.department",
] as const;
