export type GeographicAssignmentType =
  | "country"
  | "region"
  | "district"
  | "tehsil"
  | "city"
  | "route";

export interface GeographicAssignmentItem {
  type: GeographicAssignmentType;
  id: number;
  name: string;
  breadcrumb?: string;
}

export interface GeographicAssignmentIds {
  countries?: number[];
  regions?: number[];
  districts?: number[];
  tehsils?: number[];
  cities?: number[];
  routes?: number[];
}
