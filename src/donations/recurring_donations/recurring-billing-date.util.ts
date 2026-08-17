import { RecurringDonation } from "./entities/recurring-donation.entity";

const PKT_TIMEZONE = "Asia/Karachi";

export const RECURRING_BILLING_START_DAY_OF_MONTH = "day_of_month";

/** Minimum days between signup/payment and the next monthly reminder / billing date. */
export const MIN_MONTHLY_RECURRING_GAP_DAYS = 20;

export type RecurringBillingStartMode =
  | "same_date"
  | "first_of_month"
  | "custom"
  | typeof RECURRING_BILLING_START_DAY_OF_MONTH;

/** Today as YYYY-MM-DD in Pakistan time. */
export function getPktDateString(reference = new Date()): string {
  return reference.toLocaleDateString("en-CA", { timeZone: PKT_TIMEZONE });
}

export function getPktDayOfMonth(reference = new Date()): number {
  const pkt = new Date(reference.toLocaleString("en-US", { timeZone: PKT_TIMEZONE }));
  return pkt.getDate();
}

/** Clamp day to valid calendar day (e.g. 31 → 28 in Feb). */
export function clampDayToMonth(day: number, year: number, monthIndex: number): number {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const n = Math.floor(Number(day));
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, last);
}

function ymdToUtcMs(ymd: string): number {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(ymd || "").trim());
  if (!m) return NaN;
  return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Whole calendar days from reference (PKT date) to YYYY-MM-DD. */
export function calendarDaysFromReferenceToYmd(
  ymd: string,
  reference = new Date(),
): number {
  const fromMs = ymdToUtcMs(getPktDateString(reference));
  const toMs = ymdToUtcMs(ymd);
  if (!Number.isFinite(fromMs) || !Number.isFinite(toMs)) return NaN;
  return Math.round((toMs - fromMs) / 86_400_000);
}

function advanceMonthYmd(year: number, monthIndex: number, dayOfMonth: number): string {
  let y = year;
  let m = monthIndex + 1;
  if (m > 11) {
    m = 0;
    y += 1;
  }
  const finalDay = clampDayToMonth(dayOfMonth, y, m);
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(finalDay).padStart(2, "0")}`;
}

/**
 * Next calendar date (PKT) with the given day-of-month, at least
 * {@link MIN_MONTHLY_RECURRING_GAP_DAYS} after `reference`.
 * Example: donate on the 25th, pick the 5th → skips the near 5th (~10 days)
 * and returns the 5th of the following month (~40 days).
 */
export function buildStartDateForDayOfMonth(
  dayOfMonth: number,
  reference = new Date(),
  minGapDays: number = MIN_MONTHLY_RECURRING_GAP_DAYS,
): string {
  const pkt = new Date(reference.toLocaleString("en-US", { timeZone: PKT_TIMEZONE }));
  let year = pkt.getFullYear();
  let month = pkt.getMonth();
  const todayDay = pkt.getDate();
  const dom = clampDayToMonth(dayOfMonth, year, month);

  // First occurrence on or after today
  if (dom < todayDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  let candidate = `${year}-${String(month + 1).padStart(2, "0")}-${String(
    clampDayToMonth(dayOfMonth, year, month),
  ).padStart(2, "0")}`;

  // Push forward until the gap is large enough (avoids annoying near-term reminders)
  let guard = 0;
  while (
    calendarDaysFromReferenceToYmd(candidate, reference) < minGapDays &&
    guard < 14
  ) {
    const [y, m] = candidate.split("-").map(Number);
    candidate = advanceMonthYmd(y, m - 1, dayOfMonth);
    guard += 1;
  }

  return candidate;
}

/**
 * If `startDate` is within minGapDays of reference, advance month-by-month
 * keeping the same day-of-month until the gap is satisfied.
 */
export function ensureMinMonthlyGapStartDate(
  startDate: string,
  reference = new Date(),
  minGapDays: number = MIN_MONTHLY_RECURRING_GAP_DAYS,
): string {
  const trimmed = String(startDate || "").trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const day = parseDayOfMonthFromStartDate(trimmed);
  if (!day) return trimmed;

  let candidate = trimmed;
  // If in the past relative to today, rebuild from day-of-month rule
  if (calendarDaysFromReferenceToYmd(candidate, reference) < 0) {
    return buildStartDateForDayOfMonth(day, reference, minGapDays);
  }

  let guard = 0;
  while (
    calendarDaysFromReferenceToYmd(candidate, reference) < minGapDays &&
    guard < 14
  ) {
    const [y, m] = candidate.split("-").map(Number);
    candidate = advanceMonthYmd(y, m - 1, day);
    guard += 1;
  }
  return candidate;
}

/** Add whole calendar months to a YYYY-MM-DD (keeps day-of-month, clamped). */
export function addCalendarMonthsToYmd(ymd: string, months: number): string {
  const trimmed = String(ymd || "").trim().slice(0, 10);
  const parsed = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!parsed) return trimmed;
  const add = Math.floor(Number(months) || 0);
  if (!Number.isFinite(add) || add === 0) return trimmed;

  let year = Number(parsed[1]);
  let monthIndex = Number(parsed[2]) - 1 + add;
  const day = Number(parsed[3]);
  while (monthIndex > 11) {
    monthIndex -= 12;
    year += 1;
  }
  while (monthIndex < 0) {
    monthIndex += 12;
    year -= 1;
  }
  const finalDay = clampDayToMonth(day, year, monthIndex);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(finalDay).padStart(2, "0")}`;
}

/**
 * First recurring billing date after prepaid coverage.
 * @deprecated Use resolvePrepaidContinueStartDate from recurring-prepaid.util.ts
 */
export function resolvePrepaidContinueStartDateLegacyMonths(
  prepaidMonths: number,
  reference = new Date(),
  minGapDays: number = MIN_MONTHLY_RECURRING_GAP_DAYS,
): string {
  const months = Math.max(1, Math.floor(Number(prepaidMonths) || 1));
  const fromToday = getPktDateString(reference);
  const afterPrepaid = addCalendarMonthsToYmd(fromToday, months);
  return ensureMinMonthlyGapStartDate(afterPrepaid, reference, minGapDays);
}

export function parseDayOfMonthFromStartDate(startDate?: string | null): number | null {
  const trimmed = String(startDate || "").trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (!m) return null;
  const day = Number(m[3]);
  return Number.isFinite(day) && day >= 1 && day <= 31 ? day : null;
}

/** Billing day-of-month for reminders / period start (PKT). */
export function resolveSubscriptionBillingDayOfMonth(
  subscription: Pick<
    RecurringDonation,
    "start_date_mode" | "start_date" | "created_at"
  > | null | undefined,
): number {
  if (!subscription) return getPktDayOfMonth();

  const mode = String(subscription.start_date_mode || "same_date")
    .trim()
    .toLowerCase();

  if (mode === "first_of_month") {
    return 1;
  }

  if (mode === RECURRING_BILLING_START_DAY_OF_MONTH || mode === "custom") {
    const fromDate = parseDayOfMonthFromStartDate(subscription.start_date);
    if (fromDate) return fromDate;
  }

  if (subscription.start_date) {
    const fromDate = parseDayOfMonthFromStartDate(subscription.start_date);
    if (fromDate) return fromDate;
  }

  if (subscription.created_at) {
    const createdPkt = new Date(
      new Date(subscription.created_at).toLocaleString("en-US", {
        timeZone: PKT_TIMEZONE,
      }),
    );
    if (!Number.isNaN(createdPkt.getTime())) {
      return createdPkt.getDate();
    }
  }

  return getPktDayOfMonth();
}

/**
 * True when today is this subscription's monthly billing day AND
 * at least {@link MIN_MONTHLY_RECURRING_GAP_DAYS} have passed since signup,
 * and the stored first billing date (if any) has been reached.
 */
export function isSubscriptionBillingDayToday(
  subscription: Pick<
    RecurringDonation,
    "start_date_mode" | "start_date" | "created_at"
  > | null | undefined,
  reference = new Date(),
): boolean {
  const billingDay = resolveSubscriptionBillingDayOfMonth(subscription);
  if (getPktDayOfMonth(reference) !== billingDay) return false;

  const todayYmd = getPktDateString(reference);

  // Do not remind before the first scheduled billing date
  const startDate = String(subscription?.start_date || "").trim().slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(startDate) && todayYmd < startDate) {
    return false;
  }

  // Always require min gap from subscription creation (covers same_date = today)
  if (subscription?.created_at) {
    const daysSince = calendarDaysFromReferenceToYmd(
      todayYmd,
      new Date(subscription.created_at),
    );
    if (
      Number.isFinite(daysSince) &&
      daysSince < MIN_MONTHLY_RECURRING_GAP_DAYS
    ) {
      return false;
    }
  }

  return true;
}

/** Normalize start_date for persistence from API payload. */
export function resolveRecurringStartDateForStorage(params: {
  startDateMode?: string | null;
  startDate?: string | null;
  dayOfMonth?: number | null;
  reference?: Date;
}): { startDateMode: string; startDate: string | null } {
  const reference = params.reference ?? new Date();
  const mode = String(params.startDateMode || "same_date")
    .trim()
    .toLowerCase();

  if (mode === "first_of_month") {
    return {
      startDateMode: "first_of_month",
      startDate: buildStartDateForDayOfMonth(1, reference),
    };
  }

  if (mode === RECURRING_BILLING_START_DAY_OF_MONTH) {
    const day =
      Number(params.dayOfMonth) ||
      parseDayOfMonthFromStartDate(params.startDate) ||
      getPktDayOfMonth(reference);
    return {
      startDateMode: RECURRING_BILLING_START_DAY_OF_MONTH,
      startDate: buildStartDateForDayOfMonth(day, reference),
    };
  }

  if (mode === "custom") {
    const trimmed = String(params.startDate || "").trim().slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return { startDateMode: "custom", startDate: null };
    }
    return {
      startDateMode: "custom",
      startDate: ensureMinMonthlyGapStartDate(trimmed, reference),
    };
  }

  // same_date — anchor day is today; next reminder still waits for min gap via reminder check
  return {
    startDateMode: "same_date",
    startDate: getPktDateString(reference),
  };
}
