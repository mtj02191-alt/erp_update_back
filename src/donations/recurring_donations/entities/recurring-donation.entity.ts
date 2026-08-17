import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, Index } from "typeorm";

/** Master subscription row vs each paid billing cycle. */
export type RecurringDonationRecordType = "subscription" | "installment";

@Entity("recurring_donations")
export class RecurringDonation extends BaseEntity {
  @Column({ type: "varchar", length: 20, default: "subscription" })
  record_type: RecurringDonationRecordType;

  /** For installments: points to the subscription master row. */
  @Column({ type: "int", nullable: true, default: null })
  parent_id: number | null;

  @Index()
  @Column({ type: "int", nullable: true, default: null })
  initial_donation_id: number | null;

  @Column({ type: "int", nullable: true, default: null })
  donor_id: number | null;

  @Index()
  @Column({ type: "varchar", nullable: true, default: null })
  stripe_subscription_id: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripe_customer_id: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", nullable: true, default: null })
  stripe_invoice_id: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripe_payment_intent_id: string | null;

  @Index({ unique: true })
  @Column({ type: "varchar", nullable: true, default: null })
  stripe_event_id: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  billing_interval: string | null;

  @Column({ type: "int", nullable: true, default: 1 })
  billing_interval_count: number | null;

  /** Website / Stripe schedule: same_date | first_of_month | custom */
  @Column({ type: "varchar", length: 32, nullable: true, default: null })
  start_date_mode: string | null;

  /** Intended first billing date (YYYY-MM-DD calendar date stored as date). */
  @Column({ type: "date", nullable: true, default: null })
  start_date: string | null;

  @Column({ type: "boolean", nullable: true, default: null })
  consent: boolean | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  consent_at: Date | null;

  @Column({ type: "int", nullable: true, default: null })
  amount: number | null;

  @Column({ type: "varchar", nullable: true, default: null })
  currency: string | null;

  @Column({ type: "varchar", nullable: true, default: "active" })
  status: string;

  @Column({ type: "varchar", nullable: true, default: null })
  donation_method: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  project_id: string | null;

  @Column({ type: "bigint", nullable: true, default: null })
  campaign_id: number | null;

  @Column({ type: "varchar", nullable: true, default: null })
  donation_type: string | null;

  /** Months paid upfront on initial donation; reminders skipped until coverage ends. */
  @Column({ type: "int", nullable: true, default: null })
  prepaid_months: number | null;

  /** Billing periods paid upfront (days / weeks / months depending on billing_interval). */
  @Column({ type: "int", nullable: true, default: null })
  prepaid_periods: number | null;

  /** First month (YYYY-MM) covered by upfront prepaid payment. */
  @Column({ type: "varchar", length: 16, nullable: true, default: null })
  prepaid_start_period_key: string | null;

  /** Last month (YYYY-MM) covered by upfront prepaid payment. */
  @Column({ type: "varchar", length: 16, nullable: true, default: null })
  prepaid_end_period_key: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  paid_at: Date | null;

  @Column({ type: "varchar", nullable: true, default: null })
  stripe_billing_reason: string | null;

  /** Non-Stripe (manual remind): last reminder period key (e.g. 2026-07 or week range). */
  @Column({ type: "varchar", length: 40, nullable: true, default: null })
  last_reminder_period_key: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  last_reminder_sent_at: Date | null;

  /**
   * Consecutive unpaid payment-link reminders sent (cron + manual).
   * Reset when an installment is settled. Used for auto-disable after 3 reminders.
   */
  @Column({ type: "int", nullable: true, default: 0 })
  unpaid_payment_reminder_count: number | null;

  /**
   * Billing period this installment/due covers (e.g. 2026-03, week range).
   * Pending dues use this without creating a new donations row.
   */
  @Index()
  @Column({ type: "varchar", length: 40, nullable: true, default: null })
  period_key: string | null;
}
