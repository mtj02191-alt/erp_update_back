export enum ManualRecurringStatus {
  ACTIVE = "active",
  PAUSED = "paused",
  CANCELLED = "cancelled",
}

export enum ManualRecurringFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  MONTHLY = "monthly",
}

/** recurring_monthly = pay each period; prepaid_months = upfront for N months */
export enum PledgeMode {
  RECURRING_MONTHLY = "recurring_monthly",
  PREPAID_MONTHS = "prepaid_months",
}

export const MANUAL_RECURRING_STATUSES = Object.values(ManualRecurringStatus);
export const MANUAL_RECURRING_FREQUENCIES = Object.values(
  ManualRecurringFrequency,
);
export const PLEDGE_MODES = Object.values(PledgeMode);
