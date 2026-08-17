/**
 * Non-Stripe recurring subscriptions: after this many payment reminders
 * with no payment, the subscription may be auto-disabled (see ledger service).
 *
 * To enable: uncomment blocks marked "ENABLE LATER" in
 * - recurring-donations-ledger.service.ts (sendInstallmentPaymentLink, recordNonStripeInstallmentFromDonation)
 * - manual-recurring-reminder.service.ts (processNonStripeLedgerReminders)
 */
export const MAX_UNPAID_PAYMENT_REMINDERS_BEFORE_DISABLE = 3;

/** Status set when auto-disabling after unpaid reminder limit (matches UI "Canceled"). */
export const RECURRING_SUBSCRIPTION_DISABLED_STATUS = "canceled";

export const RECURRING_SUBSCRIPTION_DISABLED_REASON =
  "auto_disabled_after_unpaid_reminders";
