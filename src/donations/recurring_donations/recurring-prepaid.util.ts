import { RecurringDonation } from "./entities/recurring-donation.entity";
import {
  advanceByFrequency,
  billingIntervalToFrequency,
  getPeriodKeyForFrequency,
  getPktNow,
  listPeriodKeysBetween,
} from "src/dms/manual_recurring/utils/manual-recurring-period.util";
import { CampaignTargetFrequency } from "src/dms/campaigns/utils/campaign-recurring.constants";
import {
  addCalendarMonthsToYmd,
  ensureMinMonthlyGapStartDate,
  getPktDateString,
  MIN_MONTHLY_RECURRING_GAP_DAYS,
} from "./recurring-billing-date.util";

export type BillingInterval = "day" | "week" | "month";

export function normalizeBillingInterval(
  value?: string | null,
): BillingInterval {
  const v = String(value || "")
    .trim()
    .toLowerCase();
  if (v === "day" || v === "daily") return "day";
  if (v === "week" || v === "weekly") return "week";
  return "month";
}

export function billingIntervalFromDonationFrequency(
  frequency?: string | null,
): BillingInterval {
  const f = String(frequency || "")
    .trim()
    .toLowerCase();
  if (f === "daily") return "day";
  if (f === "weekly") return "week";
  return "month";
}

export function resolvePrepaidPeriodCount(params: {
  prepaid_periods?: number | null;
  prepaid_months?: number | null;
}): number | null {
  const fromPeriods = Number(params.prepaid_periods);
  if (Number.isFinite(fromPeriods) && fromPeriods >= 1) {
    return Math.min(36, Math.floor(fromPeriods));
  }
  const fromMonths = Number(params.prepaid_months);
  if (Number.isFinite(fromMonths) && fromMonths >= 1) {
    return Math.min(36, Math.floor(fromMonths));
  }
  return null;
}

/** Reference date inside a period key (for listPeriodKeysBetween bounds). */
export function periodKeyToReferenceDate(
  frequency: CampaignTargetFrequency,
  periodKey: string,
): Date {
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodKey);
  if (daily) {
    return new Date(
      Number(daily[1]),
      Number(daily[2]) - 1,
      Number(daily[3]),
      12,
      0,
      0,
    );
  }
  const weekly =
    /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(periodKey);
  if (weekly) {
    return new Date(weekly[1] + "T12:00:00");
  }
  const monthly = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (monthly) {
    return new Date(Number(monthly[1]), Number(monthly[2]) - 1, 15);
  }
  return getPktNow();
}

export function resolveSubscriptionPrepaidPeriodKeys(
  prepaidPeriods?: number | null,
  billingInterval: BillingInterval | string = "month",
  reference = new Date(),
): {
  prepaidPeriods: number | null;
  prepaidMonths: number | null;
  start: string | null;
  end: string | null;
} {
  const periods = Math.floor(Number(prepaidPeriods) || 0);
  if (!Number.isFinite(periods) || periods < 1) {
    return { prepaidPeriods: null, prepaidMonths: null, start: null, end: null };
  }

  const interval = normalizeBillingInterval(billingInterval);
  const frequency = billingIntervalToFrequency(interval);
  if (!frequency) {
    return { prepaidPeriods: null, prepaidMonths: null, start: null, end: null };
  }

  const start = getPeriodKeyForFrequency(frequency, reference);
  let endRef = getPktNow(reference);
  for (let i = 0; i < periods - 1; i++) {
    endRef = advanceByFrequency(endRef, frequency);
  }
  const end = getPeriodKeyForFrequency(frequency, endRef);

  return {
    prepaidPeriods: periods,
    prepaidMonths: interval === "month" ? periods : null,
    start,
    end,
  };
}

/** Inclusive period keys from start through end for the subscription interval. */
export function listPrepaidPeriodKeysInRange(
  startKey: string,
  endKey: string,
  billingInterval: BillingInterval | string,
): string[] {
  const interval = normalizeBillingInterval(billingInterval);
  const frequency = billingIntervalToFrequency(interval);
  if (!frequency || !startKey || !endKey) return [];

  const startRef = periodKeyToReferenceDate(frequency, startKey);
  const endRef = periodKeyToReferenceDate(frequency, endKey);
  return listPeriodKeysBetween(frequency, startRef, endRef, 48);
}

export function isSubscriptionPrepaidPeriodCovered(
  subscription: Pick<
    RecurringDonation,
    | "prepaid_start_period_key"
    | "prepaid_end_period_key"
    | "billing_interval"
    | "prepaid_periods"
    | "prepaid_months"
  > | null | undefined,
  periodKey: string,
): boolean {
  if (!subscription?.prepaid_start_period_key || !subscription.prepaid_end_period_key) {
    return false;
  }
  const keys = listPrepaidPeriodKeysInRange(
    subscription.prepaid_start_period_key,
    subscription.prepaid_end_period_key,
    subscription.billing_interval || "month",
  );
  return keys.includes(periodKey);
}

export function prepaidInstallmentInvoiceKey(
  donationId: number,
  periodKey: string,
): string {
  const safeKey = String(periodKey).replace(/[^a-zA-Z0-9_-]/g, "_");
  return `donation-${donationId}-prepaid-${safeKey}`;
}

/**
 * First billing/reminder date after prepaid coverage ends.
 * Monthly still respects the 20-day minimum gap.
 */
export function resolvePrepaidContinueStartDate(
  prepaidPeriods: number,
  billingInterval: BillingInterval | string = "month",
  reference = new Date(),
  minGapDays: number = MIN_MONTHLY_RECURRING_GAP_DAYS,
): string {
  const periods = Math.max(1, Math.floor(Number(prepaidPeriods) || 1));
  const interval = normalizeBillingInterval(billingInterval);
  const frequency = billingIntervalToFrequency(interval);
  if (!frequency) return getPktDateString(reference);

  if (frequency === CampaignTargetFrequency.MONTHLY) {
    const fromToday = getPktDateString(reference);
    const afterPrepaid = addCalendarMonthsToYmd(fromToday, periods);
    return ensureMinMonthlyGapStartDate(afterPrepaid, reference, minGapDays);
  }

  let cursor = getPktNow(reference);
  for (let i = 0; i < periods; i++) {
    cursor = advanceByFrequency(cursor, frequency);
  }
  return getPktDateString(cursor);
}

export function prepaidPeriodUnitLabel(
  billingInterval: BillingInterval | string,
  count = 1,
): string {
  const interval = normalizeBillingInterval(billingInterval);
  const n = Math.max(1, Math.floor(Number(count) || 1));
  if (interval === "day") return n === 1 ? "day" : "days";
  if (interval === "week") return n === 1 ? "week" : "weeks";
  return n === 1 ? "month" : "months";
}
