import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { DonationBox } from "../../entities/donation-box.entity";
import { User } from "../../../../users/user.entity";
import { DonationBoxAuditChange } from "../donation-box-audit.types";

@Entity("donation_box_audit_logs")
@Index("idx_donation_box_audit_logs_box_id", ["donation_box_id"])
@Index("idx_donation_box_audit_logs_created_at", ["created_at"])
export class DonationBoxAuditLog {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true })
  donation_box_id: number | null;

  @ManyToOne(() => DonationBox, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donation_box_id" })
  donation_box: DonationBox | null;

  @Column({ type: "varchar", length: 40 })
  action: string;

  @Column({ type: "varchar", length: 40 })
  source: string;

  @Column({ type: "jsonb", default: [] })
  changes: DonationBoxAuditChange[];

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
