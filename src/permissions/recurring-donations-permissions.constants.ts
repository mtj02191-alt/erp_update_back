/** Permission paths and OR-guards for Stripe recurring donations ledger. */

const RECURRING = "fund_raising.recurring_donations";

export const RECURRING_DONATION_LIST_VIEW_PERMISSIONS = [
  `${RECURRING}.list_view`,
] as const;

export const RECURRING_DONATION_VIEW_PERMISSIONS = [
  `${RECURRING}.view`,
] as const;

export const RECURRING_DONATION_LIST_VIEW_GUARD = [
  ...RECURRING_DONATION_LIST_VIEW_PERMISSIONS,
  "super_admin",
  "fund_raising_manager",
  "fund_raising_user",
] as const;

export const RECURRING_DONATION_VIEW_GUARD = [
  ...RECURRING_DONATION_VIEW_PERMISSIONS,
  "super_admin",
  "fund_raising_manager",
  "fund_raising_user",
] as const;
