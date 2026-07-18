import { Column, Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Dashboard monthly aggregation - 1 row per month.
 * Stores money totals and counts for donations by channel and donor type.
 */
@Entity("dashboard_monthly_agg")
@Index("idx_dashboard_monthly_agg_month", ["month_start_date"])
export class DashboardMonthlyAgg {
  /** First day of month (e.g., 2025-06-01) - PK */
  @PrimaryColumn({ type: "date" })
  month_start_date: Date;

  /** Money totals (numeric 14,2) */
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_individual_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_csr_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_events_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_online_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_phone_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_corporate_raised: number;

  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_event_channel_raised: number;

  /** Campaign totals (donations having campaign_id) */
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_campaigns_raised: number;

  /** Counts (bigint) - use number in code; PG bigint maps via transformer */
  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_donations_count: number;

  /** Counts by category (bigint) */
  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_online_donations_count: number;

  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_events_donations_count: number;

  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_csr_donations_count: number;

  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_individual_donations_count: number;

  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_campaigns_donations_count: number;

  /** Donation box (verified/deposited) totals per month */
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_donation_box_raised: number;

  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_donation_box_count: number;
}
