/** Permissions for Aid Beneficiaries / Applications (Grant case management). */
const PEOPLE = "fund_raising.aid_people";
const APPS = "fund_raising.aid_applications";

const STAFF = ["fund_raising_manager", "super_admin"] as const;

export const AID_PEOPLE_LIST_GUARD = [
  `${PEOPLE}.list_view`,
  `${PEOPLE}.view`,
  `${APPS}.list_view`,
  `${APPS}.view`,
  ...STAFF,
] as const;

export const AID_PEOPLE_VIEW_GUARD = [
  `${PEOPLE}.view`,
  `${PEOPLE}.list_view`,
  `${APPS}.view`,
  ...STAFF,
] as const;

export const AID_PEOPLE_CREATE_GUARD = [
  `${PEOPLE}.create`,
  `${APPS}.create`,
  ...STAFF,
] as const;

export const AID_PEOPLE_UPDATE_GUARD = [
  `${PEOPLE}.update`,
  `${APPS}.update`,
  ...STAFF,
] as const;

export const AID_PEOPLE_DELETE_GUARD = [`${PEOPLE}.delete`, ...STAFF] as const;

export const AID_APPLICATIONS_LIST_GUARD = [
  `${APPS}.list_view`,
  `${APPS}.view`,
  ...STAFF,
] as const;

export const AID_APPLICATIONS_VIEW_GUARD = [
  `${APPS}.view`,
  `${APPS}.list_view`,
  ...STAFF,
] as const;

export const AID_APPLICATIONS_CREATE_GUARD = [
  `${APPS}.create`,
  ...STAFF,
] as const;

export const AID_APPLICATIONS_UPDATE_GUARD = [
  `${APPS}.update`,
  ...STAFF,
] as const;

export const AID_APPLICATIONS_DELETE_GUARD = [
  `${APPS}.delete`,
  ...STAFF,
] as const;

/** CEO approve / reject after verification */
export const AID_APPLICATIONS_CEO_GUARD = [
  `${APPS}.ceo_approve`,
  `${APPS}.update`,
  ...STAFF,
] as const;

/** Mark delivery after successful CEO approval */
export const AID_APPLICATIONS_DELIVER_GUARD = [
  `${APPS}.deliver`,
  `${APPS}.update`,
  ...STAFF,
] as const;
