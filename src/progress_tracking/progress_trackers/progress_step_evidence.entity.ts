import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressTrackerStep } from "./progress_tracker_step.entity";
import { EvidenceFileType } from "../common/progress-tracking.enum";

@Entity("progress_step_evidence")
export class ProgressStepEvidence extends BaseEntity {
  @ManyToOne(() => ProgressTrackerStep, (step) => step.evidence, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tracker_step_id" })
  tracker_step: ProgressTrackerStep;

  @Column({ type: "bigint" })
  tracker_step_id: number;

  @Column()
  file_url: string;

  @Column({ type: "enum", enum: EvidenceFileType })
  file_type: EvidenceFileType;

  @Column({ nullable: true })
  title: string;

  @Column({ type: "text", nullable: true })
  caption: string;

  @Column({ default: 0 })
  sort_order: number;
}
