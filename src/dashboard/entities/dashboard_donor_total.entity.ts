import { Column, Entity, PrimaryColumn } from "typeorm";

/**
 * Stored total donors count (all time).
 * We update this when a donor is first "seen" (i.e., created via register/auto-register).
 */
@Entity("dashboard_donor_total")
export class DashboardDonorTotal {
  @PrimaryColumn({ type: "int" })
  id: number;

  @Column({
    type: "bigint",
    default: 0,
    transformer: { from: (v) => Number(v ?? 0), to: (v) => String(v ?? 0) },
  })
  total_donors_count: number;
}
