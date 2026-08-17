import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Donor } from "../../donor/entities/donor.entity";
import { EmailTemplate } from "./email_template.entity";
import { CommunicationBatch } from "./communication-batch.entity";

export enum CommunicationDeliveryStatus {
  PENDING = "pending",
  SCHEDULED = "scheduled",
  SENT = "sent",
  DELIVERED = "delivered",
  OPENED = "opened",
  CLICKED = "clicked",
  REPLIED = "replied",
  /** Recipient marked email as spam (Resend email.complained). */
  COMPLAINED = "complained",
  FAILED = "failed",
}

@Entity("communication_logs")
@Index("idx_communication_logs_donor_id", ["donor_id"])
@Index("idx_communication_logs_template_id", ["template_id"])
@Index("idx_communication_logs_batch_id", ["batch_id"])
@Index("idx_communication_logs_status", ["delivery_status"])
@Index("idx_communication_logs_provider_message_id", ["provider_message_id"])
export class CommunicationLog extends BaseEntity {
  @ManyToOne(() => CommunicationBatch, (batch) => batch.logs, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "batch_id" })
  batch: CommunicationBatch | null;

  @Column({ type: "int", nullable: true })
  batch_id: number | null;

  @ManyToOne(() => EmailTemplate, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "template_id" })
  template: EmailTemplate | null;

  @Column({ type: "int", nullable: true })
  template_id: number | null;

  @ManyToOne(() => Donor, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor | null;

  @Column({ type: "int", nullable: true })
  donor_id: number | null;

  @Column({ type: "varchar", length: 32 })
  channel: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  recipient: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  subject: string | null;

  @Column({ type: "text" })
  body: string;

  @Column({
    type: "varchar",
    length: 32,
    default: CommunicationDeliveryStatus.PENDING,
  })
  delivery_status: CommunicationDeliveryStatus;

  @Column({ type: "timestamptz", nullable: true })
  scheduled_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  sent_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  opened_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  clicked_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  replied_at: Date | null;

  /** Resend email id (result.data.id) used to match webhook open/click/delivered events. */
  @Column({ type: "varchar", length: 100, nullable: true })
  provider_message_id: string | null;

  @Column({ type: "text", nullable: true })
  error_message: string | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, any> | null;
}
