import { Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Distinct donors per month - used to compute unique donor count.
 * Composite PK (month_start_date, donor_id).
 */
@Entity("dashboard_month_donor_unique")
@Index("idx_dashboard_month_donor_unique_donor", ["donor_id"])
export class DashboardMonthDonorUnique {
  @PrimaryColumn({ type: "date" })
  month_start_date: Date;

  @PrimaryColumn({ type: "bigint" })
  donor_id: number;
}
