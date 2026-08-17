import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { EmailTemplate } from "./email_template.entity";
import { CommunicationLog } from "./communication-log.entity";
import { User } from "../../../users/user.entity";

export enum CommunicationSelectionMode {
  MANUAL = "manual",
  FILTERS = "filters",
}

export enum CommunicationBatchStatus {
  SCHEDULED = "scheduled",
  COMPLETED = "completed",
  PARTIAL = "partial",
  FAILED = "failed",
}

/** Where the bulk send was initiated from. */
export enum CommunicationSendSource {
  DONOR_BULK = "donor_bulk",
  COMMUNICATION = "communication",
}

@Entity("communication_batches")
@Index("idx_communication_batches_template_id", ["template_id"])
@Index("idx_communication_batches_sent_at", ["sent_at"])
export class CommunicationBatch extends BaseEntity {
  @ManyToOne(() => EmailTemplate, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "template_id" })
  template: EmailTemplate | null;

  @Column({ type: "int", nullable: true })
  template_id: number | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  template_name: string | null;

  @Column({ type: "varchar", length: 32 })
  channel: string;

  @Column({
    type: "varchar",
    length: 20,
    default: CommunicationSelectionMode.MANUAL,
  })
  selection_mode: CommunicationSelectionMode;

  @Column({ type: "jsonb", nullable: true })
  filters: Record<string, any> | null;

  @Column("simple-array", { nullable: true })
  donor_ids: string[] | null;

  @Column({ type: "int", default: 0 })
  matched_count: number;

  @Column({ type: "int", default: 0 })
  sent_count: number;

  @Column({ type: "int", default: 0 })
  failed_count: number;

  @Column({ type: "int", default: 0 })
  scheduled_count: number;

  @Column({ type: "timestamptz", nullable: true })
  scheduled_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  sent_at: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "sent_by_user_id" })
  sent_by: User | null;

  @Column({ type: "int", nullable: true })
  sent_by_user_id: number | null;

  @Column({
    type: "varchar",
    length: 32,
    default: CommunicationBatchStatus.COMPLETED,
  })
  batch_status: CommunicationBatchStatus;

  /** donor_bulk = donors list bulk actions; communication = Communication → Send page */
  @Column({
    type: "varchar",
    length: 32,
    default: CommunicationSendSource.COMMUNICATION,
  })
  send_source: CommunicationSendSource | string;

  @OneToMany(() => CommunicationLog, (log) => log.batch)
  logs: CommunicationLog[];
}
