import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { EvidenceFileType } from "../common/progress-tracking.enum";
import { ProgressWorkflowBatch } from "./progress_workflow_batch.entity";

@Entity("progress_batch_step_evidence")
@Index(["batch_id", "step_key"], { unique: false })
export class ProgressBatchStepEvidence extends BaseEntity {
  @ManyToOne(() => ProgressWorkflowBatch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "batch_id" })
  batch: ProgressWorkflowBatch;

  @Column({ type: "bigint" })
  batch_id: number;

  /** Step key (shared across trackers via workflow template/parent fallback) */
  @Column()
  step_key: string;

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
