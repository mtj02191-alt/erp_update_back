import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressTracker } from "./progress_tracker.entity";
import { ProgressWorkflowTemplateStep } from "../progress_workflow_templates/progress_workflow_template_step.entity";
import { ProgressWorkflowBatch } from "../progress_batches/progress_workflow_batch.entity";
import { ProgressStatus } from "../common/progress-tracking.enum";
import { ProgressStepEvidence } from "./progress_step_evidence.entity";

@Entity("progress_tracker_steps")
@Index(["tracker_id", "batch_id"])
@Index(["tracker_id", "step_key", "batch_id"])
export class ProgressTrackerStep extends BaseEntity {
  @ManyToOne(() => ProgressTracker, (tracker) => tracker.steps, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "tracker_id" })
  tracker: ProgressTracker;

  @Column({ type: "bigint" })
  tracker_id: number;

  /**
   * When set, this step row belongs to a specific physical workflow batch
   * (see `donation_batch_allocations.batch_id`). Null = template-wide row
   * before batch allocation or non-batchable templates.
   */
  @ManyToOne(() => ProgressWorkflowBatch, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "batch_id" })
  batch: ProgressWorkflowBatch | null;

  @Column({ type: "bigint", nullable: true, default: null })
  batch_id: number | null;

  @ManyToOne(() => ProgressWorkflowTemplateStep, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "template_step_id" })
  template_step: ProgressWorkflowTemplateStep;

  @Column({ type: "bigint", nullable: true })
  template_step_id: number;

  @Column()
  step_key: string;

  @Column()
  title: string;

  @Column()
  step_order: number;

  @Column({
    type: "enum",
    enum: ProgressStatus,
    default: ProgressStatus.PENDING,
  })
  status: ProgressStatus;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  started_at: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  completed_at: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  skipped_at: Date;

  @Column({ type: "timestamp with time zone", nullable: true })
  cancelled_at: Date;

  @Column({ default: false })
  donor_visible: boolean;

  @Column({ default: false })
  donor_notified: boolean;

  @OneToMany(() => ProgressStepEvidence, (evidence) => evidence.tracker_step)
  evidence: ProgressStepEvidence[];
}
