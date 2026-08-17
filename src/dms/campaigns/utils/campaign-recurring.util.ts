import { CampaignTargetFrequency } from "./campaign-recurring.constants";

export interface PeriodBounds {
  start: Date;
  end: Date;
  key: string;
  label: string;
}

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Local calendar date key (avoids UTC shift from toISOString). */
export function formatLocalDateKey(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function formatMonthYear(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", year: "numeric" });
}

export function getPeriodBounds(
  date: Date,
  frequency: CampaignTargetFrequency,
): PeriodBounds {
  const d = new Date(date);

  if (frequency === CampaignTargetFrequency.DAILY) {
    const start = startOfDay(d);
    const end = endOfDay(d);
    const key = formatLocalDateKey(start);
    return { start, end, key, label: key };
  }

  if (frequency === CampaignTargetFrequency.WEEKLY) {
    const day = d.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const start = startOfDay(new Date(d));
    start.setDate(start.getDate() + diffToMonday);
    const end = endOfDay(new Date(start));
    end.setDate(end.getDate() + 6);
    const key = `${formatLocalDateKey(start)}_${formatLocalDateKey(end)}`;
    return {
      start,
      end,
      key,
      label: `Week of ${start.toLocaleDateString("en-GB")}`,
    };
  }

  if (frequency === CampaignTargetFrequency.BI_WEEKLY) {
    const anchor = startOfDay(new Date(d.getFullYear(), 0, 1));
    const ms = startOfDay(d).getTime() - anchor.getTime();
    const fortnightMs = 14 * 24 * 60 * 60 * 1000;
    const index = Math.floor(ms / fortnightMs);
    const start = new Date(anchor.getTime() + index * fortnightMs);
    const end = endOfDay(new Date(start.getTime() + fortnightMs - 1));
    const key = `bi_${formatLocalDateKey(start)}`;
    return {
      start,
      end,
      key,
      label: `${start.toLocaleDateString("en-GB")} – ${end.toLocaleDateString("en-GB")}`,
    };
  }

  if (frequency === CampaignTargetFrequency.MONTHLY) {
    const start = startOfDay(new Date(d.getFullYear(), d.getMonth(), 1));
    const end = endOfDay(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    return { start, end, key, label: formatMonthYear(start) };
  }

  if (frequency === CampaignTargetFrequency.QUARTERLY) {
    const quarter = Math.floor(d.getMonth() / 3);
    const start = startOfDay(new Date(d.getFullYear(), quarter * 3, 1));
    const end = endOfDay(new Date(d.getFullYear(), quarter * 3 + 3, 0));
    const key = `${d.getFullYear()}-Q${quarter + 1}`;
    return { start, end, key, label: key.replace("-", " ") };
  }

  // yearly
  const start = startOfDay(new Date(d.getFullYear(), 0, 1));
  const end = endOfDay(new Date(d.getFullYear(), 11, 31));
  const key = String(d.getFullYear());
  return { start, end, key, label: key };
}

export function getFrequencyLabel(frequency?: string | null): string {
  if (!frequency) return "One-time";
  return frequency.replace(/_/g, " ");
}
