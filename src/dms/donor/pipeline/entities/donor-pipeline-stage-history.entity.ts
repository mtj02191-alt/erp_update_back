import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Donor } from "../../entities/donor.entity";
import { User } from "../../../../users/user.entity";

/**
 * Records every pipeline stage move (or same-stage note) with a reason.
 * Does not alter donation rows.
 */
@Entity("donor_pipeline_stage_history")
@Index("idx_donor_pipeline_history_donor_id", ["donor_id"])
@Index("idx_donor_pipeline_history_created_at", ["created_at"])
export class DonorPipelineStageHistory {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int" })
  donor_id: number;

  @ManyToOne(() => Donor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  /** Previous effective stage (null only for first recorded stage). */
  @Column({ type: "varchar", length: 32, nullable: true })
  from_stage: string | null;

  @Column({ type: "varchar", length: 32 })
  to_stage: string;

  /**
   * Why the contact moved (or why they stayed / did not progress).
   * Required for every recorded transition.
   */
  @Column({ type: "text" })
  reason: string;

  /**
   * advanced = moved to a different stage
   * noted = same stage note (e.g. why they did not progress)
   */
  @Column({ type: "varchar", length: 24, default: "advanced" })
  transition_type: string;

  /** Ask/Pledge amount captured with this transition (nullable for other stages). */
  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true, default: null })
  amount: number | null;

  @Column({ type: "varchar", length: 8, nullable: true, default: null })
  currency: string | null;

  @Column({ type: "int", nullable: true })
  changed_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "changed_by_id" })
  changed_by: User | null;

  @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;
}
