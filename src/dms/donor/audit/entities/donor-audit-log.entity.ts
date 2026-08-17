import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Donor } from "../../entities/donor.entity";
import { User } from "../../../../users/user.entity";
import { DonorAuditChange } from "../donor-audit.types";

@Entity("donor_audit_logs")
@Index("idx_donor_audit_logs_donor_id", ["donor_id"])
@Index("idx_donor_audit_logs_created_at", ["created_at"])
export class DonorAuditLog {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true })
  donor_id: number | null;

  @ManyToOne(() => Donor, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor | null;

  @Column({ type: "varchar", length: 40 })
  action: string;

  @Column({ type: "varchar", length: 40 })
  source: string;

  @Column({ type: "jsonb", default: [] })
  changes: DonorAuditChange[];

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
