import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DonationBoxDonation } from "../../entities/donation_box_donation.entity";
import { User } from "../../../../../users/user.entity";
import { DonationBoxDonationAuditChange } from "../donation-box-donation-audit.types";

@Entity("donation_box_donation_audit_logs")
@Index("idx_db_donation_audit_logs_record_id", ["donation_box_donation_id"])
@Index("idx_db_donation_audit_logs_created_at", ["created_at"])
export class DonationBoxDonationAuditLog {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true })
  donation_box_donation_id: number | null;

  @ManyToOne(() => DonationBoxDonation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donation_box_donation_id" })
  donation_box_donation: DonationBoxDonation | null;

  @Column({ type: "varchar", length: 40 })
  action: string;

  @Column({ type: "varchar", length: 40 })
  source: string;

  @Column({ type: "jsonb", default: [] })
  changes: DonationBoxDonationAuditChange[];

  @Column({ type: "int", nullable: true })
  performed_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "performed_by_id" })
  performed_by: User | null;

  @Column({ type: "jsonb", nullable: true })
  metadata: Record<string, unknown> | null;

  @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;
}
