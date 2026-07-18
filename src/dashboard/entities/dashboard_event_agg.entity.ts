import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
} from "typeorm";
import { Event } from "../../dms/events/entities/event.entity";

/**
 * Dashboard event aggregation - 1 row per event per month.
 * Stores totals per event for event-specific reporting.
 */
@Entity("dashboard_event_agg")
@Index("idx_dashboard_event_agg_month", ["month_start_date"])
export class DashboardEventAgg {
  @PrimaryColumn({ type: "bigint" })
  event_id: number;

  @PrimaryColumn({ type: "date" })
  month_start_date: Date;

  @ManyToOne(() => Event, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event?: Event;

  /** Totals (numeric 14,2) */
  @Column({ type: "decimal", precision: 14, scale: 2, default: 0 })
  total_event_collection: number;

  /** Counts (bigint) - use number in code */
  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_donations_count: number;

  /** Optional realtime; otherwise rebuild job sets it */
  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_donors_count: number;
}
