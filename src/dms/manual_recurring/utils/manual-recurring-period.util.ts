import { getPeriodBounds } from "../../campaigns/utils/campaign-recurring.util";
import { CampaignTargetFrequency } from "../../campaigns/utils/campaign-recurring.constants";

const PKT_TIMEZONE = "Asia/Karachi";

/** Current instant interpreted in PKT (for period boundaries). */
export function getPktNow(reference = new Date()): Date {
  return new Date(reference.toLocaleString("en-US", { timeZone: PKT_TIMEZONE }));
}

export function getPktWeekday(reference = new Date()): number {
  return getPktNow(reference).getDay(); // 0=Sun … 6=Sat
}

export function getPktDayOfMonth(reference = new Date()): number {
  return getPktNow(reference).getDate();
}

export function getMonthlyPeriodKey(reference = new Date()): string {
  return getPeriodKeyForFrequency(CampaignTargetFrequency.MONTHLY, reference);
}

export function getMonthlyPeriodBounds(reference = new Date()) {
  return getPeriodBoundsForFrequency(CampaignTargetFrequency.MONTHLY, reference);
}

export function getPeriodKeyForFrequency(
  frequency: CampaignTargetFrequency,
  reference = new Date(),
): string {
  return getPeriodBoundsForFrequency(frequency, reference).key;
}

export function getPeriodBoundsForFrequency(
  frequency: CampaignTargetFrequency,
  reference = new Date(),
) {
  const pkt = getPktNow(reference);
  return getPeriodBounds(pkt, frequency);
}

/**
 * Reminder dedupe key.
 * Weekly: allow both Saturday and Sunday reminders in the same week.
 */
export function getReminderDedupeKey(
  frequency: CampaignTargetFrequency,
  periodKey: string,
  reference = new Date(),
): string {
  if (frequency === CampaignTargetFrequency.WEEKLY) {
    const day = getPktWeekday(reference);
    const tag = day === 0 ? "sun" : day === 6 ? "sat" : `d${day}`;
    return `${periodKey}:${tag}`;
  }
  return periodKey;
}

export function formatPeriodKeyLabel(periodKey: string): string {
  // Daily: YYYY-MM-DD
  const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodKey);
  if (daily) {
    return new Date(
      Number(daily[1]),
      Number(daily[2]) - 1,
      Number(daily[3]),
    ).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  }

  // Weekly: YYYY-MM-DD_YYYY-MM-DD
  const weekly = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(periodKey);
  if (weekly) {
    return `Week ${weekly[1]} → ${weekly[2]}`;
  }

  // Monthly: YYYY-MM
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!match) return periodKey;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  return new Date(year, month, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/** Add months to YYYY-MM period key (month-safe). */
export function addMonthsToPeriodKey(periodKey: string, months: number): string {
  const match = /^(\d{4})-(\d{2})$/.exec(periodKey);
  if (!match) return periodKey;
  let year = Number(match[1]);
  let month = Number(match[2]) - 1 + months;
  while (month < 0) {
    month += 12;
    year -= 1;
  }
  while (month > 11) {
    month -= 12;
    year += 1;
  }
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function computePrepaidEndPeriodKey(
  startPeriodKey: string,
  months: number,
): string {
  if (months < 1) return startPeriodKey;
  return addMonthsToPeriodKey(startPeriodKey, months - 1);
}

export function isPeriodKeyInRange(
  periodKey: string,
  startKey: string | null | undefined,
  endKey: string | null | undefined,
): boolean {
  if (!startKey || !endKey) return false;
  return periodKey >= startKey && periodKey <= endKey;
}

/** Frequencies that should run on this PKT calendar day. */
export function getDueReminderFrequencies(
  reference = new Date(),
): CampaignTargetFrequency[] {
  const due: CampaignTargetFrequency[] = [CampaignTargetFrequency.DAILY];
  const weekday = getPktWeekday(reference);
  if (weekday === 0 || weekday === 6) {
    due.push(CampaignTargetFrequency.WEEKLY);
  }
  if (getPktDayOfMonth(reference) === 2) {
    due.push(
      CampaignTargetFrequency.MONTHLY,
      CampaignTargetFrequency.BI_WEEKLY,
      CampaignTargetFrequency.QUARTERLY,
      CampaignTargetFrequency.YEARLY,
    );
  }
  return due;
}

/** Map recurring_donations.billing_interval → campaign frequency. */
export function billingIntervalToFrequency(
  billingInterval: string | null | undefined,
): CampaignTargetFrequency | null {
  const v = String(billingInterval || "")
    .trim()
    .toLowerCase();
  if (v === "day" || v === "daily") return CampaignTargetFrequency.DAILY;
  if (v === "week" || v === "weekly") return CampaignTargetFrequency.WEEKLY;
  if (v === "month" || v === "monthly") return CampaignTargetFrequency.MONTHLY;
  if (v === "year" || v === "yearly") return CampaignTargetFrequency.YEARLY;
  return null;
}

/** Move a reference date forward by one billing period (local calendar). */
export function advanceByFrequency(
  reference: Date,
  frequency: CampaignTargetFrequency,
): Date {
  const d = new Date(reference);
  if (frequency === CampaignTargetFrequency.DAILY) {
    d.setDate(d.getDate() + 1);
    return d;
  }
  if (frequency === CampaignTargetFrequency.WEEKLY) {
    d.setDate(d.getDate() + 7);
    return d;
  }
  if (frequency === CampaignTargetFrequency.BI_WEEKLY) {
    d.setDate(d.getDate() + 14);
    return d;
  }
  if (frequency === CampaignTargetFrequency.MONTHLY) {
    d.setMonth(d.getMonth() + 1);
    return d;
  }
  if (frequency === CampaignTargetFrequency.QUARTERLY) {
    d.setMonth(d.getMonth() + 3);
    return d;
  }
  d.setFullYear(d.getFullYear() + 1);
  return d;
}

/**
 * Inclusive list of period keys from startRef through endRef (capped).
 * Used to open missing period dues without creating donations.
 */
export function listPeriodKeysBetween(
  frequency: CampaignTargetFrequency,
  startRef: Date,
  endRef: Date,
  maxKeys = 36,
): string[] {
  const keys: string[] = [];
  const seen = new Set<string>();
  let cursor = new Date(startRef);
  const endMs = endRef.getTime();
  let guard = 0;

  while (guard < maxKeys + 5 && cursor.getTime() <= endMs + 86400000) {
    guard += 1;
    const key = getPeriodKeyForFrequency(frequency, cursor);
    if (!seen.has(key)) {
      seen.add(key);
      keys.push(key);
      if (keys.length >= maxKeys) break;
    }
    const endKey = getPeriodKeyForFrequency(frequency, endRef);
    if (key === endKey) break;
    cursor = advanceByFrequency(cursor, frequency);
  }

  return keys;
}
