/** Task.project_id prefix — one follow-up task per donation. */
export const DONATION_PENDING_TASK_PROJECT_PREFIX = "donation-pending:";

/**
 * Kill switch for pending/failed website donation → call-center task creation.
 * Set true to re-enable cron + manual follow-up task creation.
 */
export const DONATION_PENDING_FOLLOW_UP_ENABLED = false;

/** Minutes after creation before a pending donation triggers a call-center task. */
export const PENDING_DONATION_FOLLOW_UP_MINUTES = 3;

/** Only create follow-up tasks when donation amount is at least this (PKR / currency units). */
export const MIN_DONATION_FOLLOW_UP_AMOUNT = 1000;

export const DONATION_PENDING_MOV_ITEMS = [
  "Contacted Donor",
  "Not Contacted Donor",
] as const;

/** Website donations in these statuses may trigger a call-center follow-up task. */
export const WEBSITE_DONATION_FOLLOW_UP_STATUSES = [
  "pending",
  "failed",
] as const;

export function donationPendingTaskProjectId(donationId: number): string {
  return `${DONATION_PENDING_TASK_PROJECT_PREFIX}${donationId}`;
}

export function isDonationPendingFollowUpProjectId(
  projectId: string | null | undefined,
): boolean {
  return (
    typeof projectId === "string" &&
    projectId.startsWith(DONATION_PENDING_TASK_PROJECT_PREFIX)
  );
}

export function isWebsiteDonationFollowUpStatus(
  status: string | null | undefined,
): boolean {
  const normalized = String(status || "").toLowerCase();
  return (WEBSITE_DONATION_FOLLOW_UP_STATUSES as readonly string[]).includes(
    normalized,
  );
}

const PKT_TIMEZONE = "Asia/Karachi";

/** Today as YYYY-MM-DD in Pakistan time. */
export function getPktDateString(reference = new Date()): string {
  return reference.toLocaleDateString("en-CA", { timeZone: PKT_TIMEZONE });
}

/** Parse optional YYYY-MM-DD; defaults to today (PKT). */
export function resolveDonationFollowUpDate(input?: string): string {
  const trimmed = String(input || "").trim();
  if (!trimmed) {
    return getPktDateString();
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw new Error("date must be YYYY-MM-DD");
  }
  return trimmed;
}

export function isPktToday(dateStr: string): boolean {
  return dateStr === getPktDateString();
}
