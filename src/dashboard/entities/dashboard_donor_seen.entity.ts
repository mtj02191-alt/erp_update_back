import { Entity, Index, PrimaryColumn } from "typeorm";

/**
 * Uniqueness table for donors seen at least once (any donation attempt).
 * PK (donor_id) ensures we only increment total donors once.
 */
@Entity("dashboard_donor_seen")
@Index("idx_dashboard_donor_seen_donor", ["donor_id"])
export class DashboardDonorSeen {
  @PrimaryColumn({ type: "bigint" })
  donor_id: number;
}
