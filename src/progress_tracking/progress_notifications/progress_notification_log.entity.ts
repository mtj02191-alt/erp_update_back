import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressTracker } from "../progress_trackers/progress_tracker.entity";
import { ProgressTrackerStep } from "../progress_trackers/progress_tracker_step.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { NotificationChannel } from "../common/progress-tracking.enum";

@Entity("progress_notification_logs")
export class ProgressNotificationLog extends BaseEntity {
  @ManyToOne(() => ProgressTracker, (tracker) => tracker.notification_logs, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "tracker_id" })
  tracker: ProgressTracker;

  @Column({ type: "bigint", nullable: true })
  tracker_id: number;

  @ManyToOne(() => ProgressTrackerStep, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "tracker_step_id" })
  tracker_step: ProgressTrackerStep;

  @Column({ type: "bigint", nullable: true })
  tracker_step_id: number;

  @ManyToOne(() => Donation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donation_id" })
  donation: Donation;

  @Column({ type: "bigint", nullable: true })
  donation_id: number;

  @Column({ type: "enum", enum: NotificationChannel })
  channel: NotificationChannel;

  @Column()
  recipient: string;

  @Column()
  status: string; // e.g., 'sent', 'failed', 'queued'

  @Column({ nullable: true })
  subject: string;

  @Column({ type: "text", nullable: true })
  message_preview: string;

  @Column({ type: "jsonb", nullable: true })
  payload: object;

  @Column({ type: "jsonb", nullable: true })
  provider_response: object;

  @Column({ type: "text", nullable: true })
  failure_reason: string;

  @Column({ type: "timestamp with time zone", nullable: true })
  sent_at: Date;
}
