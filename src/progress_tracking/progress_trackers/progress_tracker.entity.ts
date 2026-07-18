import {
  Entity,
  Column,
  Index,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";
import { Donation } from "../../donations/entities/donation.entity";
import {
  ParentEntityType,
  TrackerOverallStatus,
} from "../common/progress-tracking.enum";
import { ProgressTrackerStep } from "./progress_tracker_step.entity";
import { ProgressNotificationLog } from "../progress_notifications/progress_notification_log.entity";

@Entity("progress_trackers")
export class ProgressTracker extends BaseEntity {
  @ManyToOne(() => Donation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donation_id" })
  donation: Donation;

  @Column({ type: "bigint", nullable: true })
  donation_id: number;

  @Column({ type: "enum", enum: ParentEntityType, nullable: true })
  parent_type: ParentEntityType;

  @Column({ type: "bigint", nullable: true })
  parent_id: number;

  @ManyToOne(() => ProgressWorkflowTemplate, (template) => template.trackers, {
    onDelete: "RESTRICT",
  })
  @JoinColumn({ name: "template_id" })
  template: ProgressWorkflowTemplate;

  @Column({ type: "bigint" })
  template_id: number;

  /**
   * For batchable templates: how many parts/shares this tracker should allocate
   * for the linked donation (e.g., 2 parts out of 7). Nullable for non-batch use.
   */
  @Column({ type: "int", nullable: true })
  batch_parts_count: number | null;

  @Column({
    type: "enum",
    enum: TrackerOverallStatus,
    default: TrackerOverallStatus.PENDING,
  })
  overall_status: TrackerOverallStatus;

  @Column({ unique: true, nullable: true })
  public_tracking_token: string;

  @Column({ default: false })
  donor_visible: boolean;

  @OneToMany(() => ProgressTrackerStep, (step) => step.tracker)
  steps: ProgressTrackerStep[];

  @OneToMany(() => ProgressNotificationLog, (log) => log.tracker)
  notification_logs: ProgressNotificationLog[];
}
