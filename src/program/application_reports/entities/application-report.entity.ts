import { User } from "../../../users/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("program_application_reports")
export class ApplicationReport {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "date", name: "report_date" })
  report_date: Date;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "varchar", length: 255 })
  project: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  subprogram: string;

  @Column({ type: "int", name: "pending_last_month", default: 0 })
  pending_last_month: number;

  @Column({ type: "int", name: "application_count", default: 0 })
  application_count: number;

  @Column({ type: "int", name: "investigation_count", default: 0 })
  investigation_count: number;

  @Column({ type: "int", name: "verified_count", default: 0 })
  verified_count: number;

  @Column({ type: "int", name: "approved_count", default: 0 })
  approved_count: number;

  @Column({ type: "int", name: "rejected_count", default: 0 })
  rejected_count: number;

  @Column({ type: "int", name: "pending_count", default: 0 })
  pending_count: number;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "updated_by" })
  updated_by: User;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  updated_at: Date;
}
