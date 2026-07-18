import { Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Optional month→event mapping.
 * Tracks which events had donations in which months.
 */
@Entity("dashboard_month_events")
@Index("idx_dashboard_month_events_month", ["month_start_date"])
export class DashboardMonthEvents {
  @PrimaryColumn({ type: "date" })
  month_start_date: Date;

  @PrimaryColumn({ type: "bigint" })
  event_id: number;
}
