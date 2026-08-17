export const TASK_REMINDER_TIMEZONE = "Asia/Karachi";

export function formatDateOnlyPkt(d: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TASK_REMINDER_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function getPktHour(d: Date = new Date()): number {
  const hour = new Intl.DateTimeFormat("en-GB", {
    timeZone: TASK_REMINDER_TIMEZONE,
    hour: "2-digit",
    hour12: false,
  }).format(d);
  return parseInt(hour, 10);
}

export function dueDateToPktDateString(dueDate: Date | string): string {
  if (typeof dueDate === "string") {
    return dueDate.slice(0, 10);
  }
  return formatDateOnlyPkt(dueDate);
}

/** Calendar date offset_days before due date (PKT calendar days). */
export function computeRemindOnDate(
  dueDate: Date | string,
  offsetDays: number,
): string {
  const dueStr = dueDateToPktDateString(dueDate);
  const [y, m, d] = dueStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - offsetDays);
  return dt.toISOString().slice(0, 10);
}

export function isReminderSlotInPast(
  remindOnDate: string,
  remindAtHour: number,
): boolean {
  const now = new Date();
  const today = formatDateOnlyPkt(now);
  const hour = getPktHour(now);
  if (remindOnDate < today) return true;
  if (remindOnDate === today && remindAtHour < hour) return true;
  return false;
}

export function dueReminderLabel(offsetDays: number): string {
  if (offsetDays === 0) return "due today";
  if (offsetDays === 1) return "due tomorrow";
  return `due in ${offsetDays} days`;
}

export function formatPktHourLabel(hour: number): string {
  const h = Math.max(0, Math.min(23, hour));
  if (h === 0) return "12:00 AM";
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return "12:00 PM";
  return `${h - 12}:00 PM`;
}
