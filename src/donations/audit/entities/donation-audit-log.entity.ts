import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Donation } from "../../entities/donation.entity";
import { User } from "../../../users/user.entity";
import { DonationAuditChange } from "../donation-audit.types";

@Entity("donation_audit_logs")
@Index("idx_donation_audit_logs_donation_id", ["donation_id"])
@Index("idx_donation_audit_logs_created_at", ["created_at"])
export class DonationAuditLog {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true })
  donation_id: number | null;

  @ManyToOne(() => Donation, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donation_id" })
  donation: Donation | null;

  @Column({ type: "varchar", length: 40 })
  action: string;

  @Column({ type: "varchar", length: 40 })
  source: string;

  @Column({ type: "jsonb", default: [] })
  changes: DonationAuditChange[];

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
