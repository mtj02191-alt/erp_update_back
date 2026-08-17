/** Permissions for corporate organizations / branches CRM. */
const ORG = "fund_raising.organizations";

export const ORGANIZATION_LIST_GUARD = [
  `${ORG}.list_view`,
  `${ORG}.view`,
  "fund_raising.donors.list_view",
  "fund_raising.donors.view",
  "fund_raising.offline_donors.list_view",
  "fund_raising.online_donors.list_view",
  "fund_raising_manager",
  "super_admin",
] as const;

export const ORGANIZATION_VIEW_GUARD = [
  `${ORG}.view`,
  `${ORG}.list_view`,
  "fund_raising.donors.view",
  "fund_raising.offline_donors.view",
  "fund_raising.online_donors.view",
  "fund_raising_manager",
  "super_admin",
] as const;

export const ORGANIZATION_CREATE_GUARD = [
  `${ORG}.create`,
  "fund_raising.donors.create",
  "fund_raising.offline_donors.create",
  "fund_raising.online_donors.create",
  "fund_raising_manager",
  "super_admin",
] as const;

export const ORGANIZATION_UPDATE_GUARD = [
  `${ORG}.update`,
  "fund_raising.donors.update",
  "fund_raising.offline_donors.update",
  "fund_raising.online_donors.update",
  "fund_raising_manager",
  "super_admin",
] as const;

export const ORGANIZATION_DELETE_GUARD = [
  `${ORG}.delete`,
  "fund_raising.donors.delete",
  "fund_raising_manager",
  "super_admin",
] as const;
